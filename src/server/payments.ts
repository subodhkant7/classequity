import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { minor } from '@/lib/domain';
import { type Actor, roles } from './auth';
import { ownObligation, ownTrip } from './data';
import { AppError, requireValue } from './errors';
import { paypal, ProviderFailure } from './integrations/paypal';
import { record, uid } from './services';
export async function paymentOrder(a: Actor, obligationId: string) {
  const ob = await ownObligation(a, obligationId);
  if (ob.cents <= 0) throw new AppError('No payment is due.');
  let [op] = await db
    .insert(s.operations)
    .values({
      id: uid(),
      schoolId: a.schoolId,
      obligationId,
      mode: a.mode,
      requestKey: uid(),
      status: 'CREATED',
    })
    .onConflictDoNothing({ target: s.operations.obligationId })
    .returning();
  if (!op)
    [op] = await db.select().from(s.operations).where(eq(s.operations.obligationId, obligationId));
  if (op.mode !== a.mode) throw new AppError('Provider mode mismatch', 409);
  if (op.status === 'COMPLETED')
    return { operationId: op.id, status: op.status, approvalUrl: null };
  if (op.orderId && op.approvalUrl)
    return { operationId: op.id, status: op.status, approvalUrl: op.approvalUrl };
  if (a.mode === 'demo') return { operationId: op.id, status: op.status, approvalUrl: null };
  if (Date.now() - op.createdAt.getTime() > 6 * 3600000 && op.status === 'UNKNOWN')
    throw new AppError(
      'Unknown operation exceeds retry window. Finance must investigate with PayPal.',
      409,
    );
  const [claimed] = await db
    .update(s.operations)
    .set({ status: 'CREATING', updatedAt: new Date() })
    .where(
      and(
        eq(s.operations.id, op.id),
        inArray(s.operations.status, ['CREATED', 'FAILED', 'UNKNOWN']),
      ),
    )
    .returning();
  if (!claimed)
    throw new AppError('This operation is already in progress. Reconcile before continuing.', 409);
  try {
    const result = await paypal.create(ob.cents, ob.id, op.requestKey);
    const approval = result.links?.find(
      (l) => l.rel === 'payer-action' || l.rel === 'approve',
    )?.href;
    if (!approval || !approval.startsWith('https://www.sandbox.paypal.com/'))
      throw new ProviderFailure(true, 'MISSING_APPROVAL_LINK');
    await db
      .update(s.operations)
      .set({
        orderId: result.id,
        status: 'AWAITING_APPROVAL',
        approvalUrl: approval,
        updatedAt: new Date(),
        errorCode: null,
      })
      .where(eq(s.operations.id, op.id));
    await record(a, 'PAYPAL_ORDER_CREATED', op.id);
    return { operationId: op.id, status: 'AWAITING_APPROVAL', approvalUrl: approval };
  } catch (e) {
    await db
      .update(s.operations)
      .set({
        status: e instanceof ProviderFailure && !e.ambiguous ? 'FAILED' : 'UNKNOWN',
        errorCode: e instanceof AppError ? e.code : 'PROVIDER_ERROR',
        updatedAt: new Date(),
      })
      .where(eq(s.operations.id, op.id));
    throw e;
  }
}
export async function settleOperation(operationId: string) {
  const [op] = await db.select().from(s.operations).where(eq(s.operations.id, operationId));
  requireValue(op);
  if (op.mode === 'demo') return op;
  if (!op.orderId) return op;
  const [ob] = await db.select().from(s.obligations).where(eq(s.obligations.id, op.obligationId));
  requireValue(ob);
  const order = await paypal.order(op.orderId);
  const pu = order.purchaseUnits?.[0];
  if (
    order.purchaseUnits?.length !== 1 ||
    pu?.customId !== ob.id ||
    pu.amount?.currencyCode !== 'USD' ||
    minor(pu.amount.value) !== ob.cents
  )
    throw new AppError(
      'PayPal order does not match the stored obligation.',
      409,
      'INTEGRITY_MISMATCH',
    );
  const captured = pu.payments?.captures?.[0];
  if (!captured?.id) {
    const next =
      order.status === 'APPROVED'
        ? 'APPROVED'
        : order.status === 'VOIDED'
          ? 'FAILED'
          : order.status === 'COMPLETED'
            ? 'UNKNOWN'
            : 'AWAITING_APPROVAL';
    await db
      .update(s.operations)
      .set({ status: next, updatedAt: new Date() })
      .where(eq(s.operations.id, op.id));
    return { ...op, status: next };
  }
  const cap = await paypal.captureRead(captured.id);
  const providerStatus: string = cap.status || 'UNKNOWN';
  if (
    !cap.id ||
    !cap.status ||
    cap.amount?.currencyCode !== 'USD' ||
    minor(cap.amount.value) !== ob.cents
  )
    throw new AppError('Capture integrity verification failed.', 409, 'INTEGRITY_MISMATCH');
  const related = cap.supplementaryData?.relatedIds?.orderId;
  if (related && related !== op.orderId)
    throw new AppError('Capture belongs to a different order.', 409);
  const fee = cap.sellerReceivableBreakdown?.paypalFee;
  if (!fee?.value || fee.currencyCode !== 'USD')
    throw new AppError(
      'Capture processing fee is unverified. Reconciliation required.',
      409,
      'FEE_UNKNOWN',
    );
  let refundedCents = 0;
  let refundUnresolved = false;
  const existingRefunds = await db
    .select()
    .from(s.refunds)
    .innerJoin(s.captures, eq(s.refunds.captureId, s.captures.id))
    .where(eq(s.captures.operationId, op.id));
  for (const x of existingRefunds) {
    if (!x.ce_refund_operations.providerId) {
      if (['UNKNOWN', 'REQUESTED', 'PENDING'].includes(x.ce_refund_operations.status))
        refundUnresolved = true;
      continue;
    }
    const result = await paypal.refundRead(x.ce_refund_operations.providerId);
    if (result.status) {
      await db
        .update(s.refunds)
        .set({ status: result.status })
        .where(eq(s.refunds.id, x.ce_refund_operations.id));
      if (result.status === 'COMPLETED') refundedCents += x.ce_refund_operations.cents;
      else if (result.status !== 'FAILED' && result.status !== 'CANCELLED') refundUnresolved = true;
    }
  }
  // Provider-side refunds/reversals remain authoritative even if initiated outside the application.
  const breakdown = cap.sellerReceivableBreakdown as typeof cap.sellerReceivableBreakdown & {
    totalRefundedAmount?: { value: string; currencyCode: string };
  };
  if (breakdown?.totalRefundedAmount?.currencyCode === 'USD')
    refundedCents = Math.max(refundedCents, minor(breakdown.totalRefundedAmount.value));
  if (cap.status === 'REFUNDED' || providerStatus === 'REVERSED') refundedCents = ob.cents;
  if (cap.status === 'PARTIALLY_REFUNDED' && refundedCents === 0) {
    refundedCents = ob.cents;
    refundUnresolved = true;
  }
  const status =
    cap.status === 'COMPLETED'
      ? 'COMPLETED'
      : cap.status === 'REFUNDED'
        ? 'REFUNDED'
        : cap.status === 'PARTIALLY_REFUNDED'
          ? 'PARTIALLY_REFUNDED'
          : cap.status === 'DECLINED' || cap.status === 'FAILED'
            ? 'FAILED'
            : providerStatus === 'REVERSED'
              ? 'REVERSED'
              : 'PENDING';
  await db.transaction(async (tx) => {
    await tx
      .insert(s.captures)
      .values({
        id: uid(),
        operationId: op.id,
        providerId: cap.id!,
        cents: ob.cents,
        feeCents: minor(fee.value),
        status,
        refundedCents,
      })
      .onConflictDoUpdate({
        target: s.captures.operationId,
        set: { status, feeCents: minor(fee.value), refundedCents },
      });
    await tx
      .update(s.operations)
      .set({
        status: refundUnresolved ? 'REFUND_PENDING' : status,
        updatedAt: new Date(),
        errorCode: null,
      })
      .where(eq(s.operations.id, op.id));
  });
  return { ...op, status: refundUnresolved ? 'REFUND_PENDING' : status };
}
export async function capturePayment(a: Actor, obligationId: string) {
  await ownObligation(a, obligationId);
  const [op] = await db
    .select()
    .from(s.operations)
    .where(eq(s.operations.obligationId, obligationId));
  requireValue(op);
  if (a.mode === 'demo') {
    if (op.status === 'COMPLETED') return op;
    const [ob] = await db.select().from(s.obligations).where(eq(s.obligations.id, obligationId));
    await db.transaction(async (tx) => {
      await tx
        .insert(s.captures)
        .values({
          id: uid(),
          operationId: op.id,
          providerId: `SIM-${op.id}`,
          cents: ob.cents,
          feeCents: 85,
          status: 'COMPLETED',
        })
        .onConflictDoNothing({ target: s.captures.operationId });
      await tx
        .update(s.operations)
        .set({ status: 'COMPLETED', updatedAt: new Date() })
        .where(eq(s.operations.id, op.id));
    });
    await record(a, 'SIMULATED_CAPTURE', op.id);
    return { status: 'COMPLETED' };
  }
  const current = await settleOperation(op.id);
  if (current.status === 'COMPLETED') return current;
  if (current.status !== 'APPROVED')
    throw new AppError(
      'Complete PayPal buyer approval before capture. Unknown outcomes require reconciliation.',
      409,
    );
  const [claimed] = await db
    .update(s.operations)
    .set({ status: 'CAPTURING', updatedAt: new Date() })
    .where(and(eq(s.operations.id, op.id), eq(s.operations.status, 'APPROVED')))
    .returning();
  if (!claimed) throw new AppError('Capture already in progress.', 409);
  try {
    await paypal.capture(requireValue(op.orderId), `${op.requestKey}-capture`);
    const result = await settleOperation(op.id);
    await record(a, 'PAYPAL_CAPTURE_READBACK', op.id);
    return result;
  } catch (e) {
    await db
      .update(s.operations)
      .set({
        status: e instanceof ProviderFailure && !e.ambiguous ? 'FAILED' : 'UNKNOWN',
        errorCode: e instanceof AppError ? e.code : 'CAPTURE_UNKNOWN',
        updatedAt: new Date(),
      })
      .where(eq(s.operations.id, op.id));
    try {
      const reconciled = await settleOperation(op.id);
      if (reconciled.status === 'COMPLETED') return reconciled;
    } catch {}
    throw e;
  }
}
export async function reconcile(a: Actor, operationId: string) {
  roles(a, ['finance', 'parent']);
  const [op] = await db
    .select()
    .from(s.operations)
    .where(and(eq(s.operations.id, operationId), eq(s.operations.schoolId, a.schoolId)));
  requireValue(op);
  await ownObligation(a, op.obligationId);
  if (op.mode === 'demo') return { status: op.status, simulation: true };
  const result = await settleOperation(op.id);
  await record(a, 'PAYMENT_RECONCILED', op.id);
  return result;
}
export async function refundPayment(a: Actor, captureId: string) {
  roles(a, ['finance']);
  const [cap] = await db.select().from(s.captures).where(eq(s.captures.id, captureId));
  requireValue(cap);
  const [op] = await db.select().from(s.operations).where(eq(s.operations.id, cap.operationId));
  requireValue(op);
  const ob = await ownObligation(a, op.obligationId);
  await ownTrip(a, ob.tripId);
  if (cap.status !== 'COMPLETED') throw new AppError('Only completed captures can be refunded.');
  const [claim] = await db
    .insert(s.refunds)
    .values({
      id: uid(),
      captureId,
      requestKey: uid(),
      status: 'REQUESTED',
      cents: cap.cents,
      authorizedBy: a.userId,
    })
    .onConflictDoNothing({ target: s.refunds.captureId })
    .returning();
  if (!claim)
    throw new AppError(
      'A full-refund operation already exists. Reconcile it before retrying.',
      409,
    );
  if (a.mode === 'demo') {
    await db.transaction(async (tx) => {
      await tx
        .update(s.refunds)
        .set({ status: 'COMPLETED', providerId: `SIM-REFUND-${claim.id}` })
        .where(eq(s.refunds.id, claim.id));
      await tx
        .update(s.captures)
        .set({ status: 'REFUNDED', refundedCents: cap.cents })
        .where(eq(s.captures.id, cap.id));
      await tx.update(s.operations).set({ status: 'REFUNDED' }).where(eq(s.operations.id, op.id));
    });
    await record(a, 'SIMULATED_REFUND', claim.id);
    return { status: 'COMPLETED' };
  }
  try {
    const result = await paypal.refund(cap.providerId, claim.requestKey);
    if (!result.id) throw new ProviderFailure(true, 'MISSING_REFUND_ID');
    await db
      .update(s.refunds)
      .set({ providerId: result.id, status: result.status ?? 'UNKNOWN' })
      .where(eq(s.refunds.id, claim.id));
    await settleOperation(op.id);
    await record(a, 'REFUND_AUTHORIZED', claim.id);
    return { status: result.status };
  } catch (e) {
    await db
      .update(s.refunds)
      .set({ status: e instanceof ProviderFailure && !e.ambiguous ? 'FAILED' : 'UNKNOWN' })
      .where(eq(s.refunds.id, claim.id));
    await db
      .update(s.operations)
      .set({ status: 'REFUND_PENDING' })
      .where(eq(s.operations.id, op.id));
    throw e;
  }
}

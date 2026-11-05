import { and, eq, isNull, sql, desc } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { minor } from '@/lib/domain';
import { orderReadbackState, captureReadbackState } from '@/lib/payment-state';
import { type Actor, roles } from './auth';
import { ownObligation, ownTrip } from './data';
import { AppError, requireValue } from './errors';
import { paypal, ProviderFailure } from './integrations/paypal';
import { record, uid } from './services';
const conflict = () =>
  new AppError('Operation changed during readback. Reconcile again.', 409, 'STALE_READBACK');
export async function paymentOrder(a: Actor, obligationId: string) {
  const ob = await ownObligation(a, obligationId);
  const trip = await ownTrip(a, ob.tripId);
  const [snap] = await db.select().from(s.snapshots).where(eq(s.snapshots.id, ob.snapshotId));
  if (!snap || snap.tripId !== trip.id || trip.state !== 'FROZEN')
    throw new AppError('A frozen funding snapshot is required.', 409);
  if (ob.registrationId) {
    const [consent] = await db
      .select()
      .from(s.consents)
      .where(eq(s.consents.registrationId, ob.registrationId))
      .orderBy(desc(s.consents.createdAt))
      .limit(1);
    if (!consent?.accepted || consent.ceilingCents < snap.seatCents)
      throw new AppError('Current parent consent is required.', 409);
  }
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
  if (['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'REVERSED'].includes(op.status))
    return { operationId: op.id, status: op.status, approvalUrl: null };
  if (op.orderId && op.approvalUrl && ['AWAITING_APPROVAL', 'APPROVED'].includes(op.status))
    return { operationId: op.id, status: op.status, approvalUrl: op.approvalUrl };
  if (a.mode === 'demo') return { operationId: op.id, status: op.status, approvalUrl: null };
  // No automatic mutation retry, including UNKNOWN or an expired provider retention window.
  const [claim] = await db
    .update(s.operations)
    .set({ status: 'CREATING', version: sql`${s.operations.version}+1`, updatedAt: new Date() })
    .where(
      and(
        eq(s.operations.id, op.id),
        eq(s.operations.version, op.version),
        eq(s.operations.status, 'CREATED'),
      ),
    )
    .returning();
  if (!claim)
    throw new AppError(
      'Order already attempted. Reconcile; finance must investigate outcomes without an order ID.',
      409,
    );
  try {
    const result = await paypal.create(ob.cents, ob.id, op.requestKey, ob.tripId);
    const approval = result.links?.find(
      (l) => l.rel === 'payer-action' || l.rel === 'approve',
    )?.href;
    if (!approval || new URL(approval).origin !== 'https://www.sandbox.paypal.com')
      throw new ProviderFailure(true, 'MISSING_APPROVAL_LINK');
    const [saved] = await db
      .update(s.operations)
      .set({
        orderId: result.id,
        status: 'AWAITING_APPROVAL',
        approvalUrl: approval,
        version: sql`${s.operations.version}+1`,
        updatedAt: new Date(),
        errorCode: null,
      })
      .where(and(eq(s.operations.id, op.id), eq(s.operations.version, claim.version)))
      .returning();
    if (!saved) throw conflict();
    await record(a, 'PAYPAL_ORDER_CREATED', op.id);
    return { operationId: op.id, status: saved.status, approvalUrl: approval };
  } catch (e) {
    await db
      .update(s.operations)
      .set({
        status: e instanceof ProviderFailure && !e.ambiguous ? 'FAILED' : 'UNKNOWN',
        version: sql`${s.operations.version}+1`,
        errorCode: e instanceof AppError ? e.code : 'PROVIDER_ERROR',
        updatedAt: new Date(),
      })
      .where(and(eq(s.operations.id, op.id), eq(s.operations.version, claim.version)));
    throw e;
  }
}
export async function settleOperation(operationId: string, refundHint?: string) {
  const [op] = await db.select().from(s.operations).where(eq(s.operations.id, operationId));
  requireValue(op);
  if (op.mode === 'demo' || !op.orderId) return op;
  const [ob] = await db.select().from(s.obligations).where(eq(s.obligations.id, op.obligationId));
  requireValue(ob);
  const order = await paypal.order(op.orderId);
  const pu = order.purchaseUnits?.[0];
  if (
    order.id !== op.orderId ||
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
  if ((pu.payments?.captures?.length || 0) > 1)
    throw new AppError(
      'Unexpected multiple captures; finance investigation required.',
      409,
      'INTEGRITY_MISMATCH',
    );
  const captured = pu.payments?.captures?.[0];
  if (!captured?.id) {
    const next =
      op.status === 'CAPTURING' &&
      op.captureRequestedAt &&
      Date.now() - op.captureRequestedAt.getTime() > 120000
        ? 'UNKNOWN'
        : orderReadbackState(op.status, order.status, !!op.captureRequestedAt);
    const [saved] = await db
      .update(s.operations)
      .set({ status: next, version: sql`${s.operations.version}+1`, updatedAt: new Date() })
      .where(and(eq(s.operations.id, op.id), eq(s.operations.version, op.version)))
      .returning();
    if (!saved) throw conflict();
    return saved;
  }
  const cap = await paypal.captureRead(captured.id);
  if (
    cap.id !== captured.id ||
    !cap.status ||
    cap.amount?.currencyCode !== 'USD' ||
    minor(cap.amount.value) !== ob.cents ||
    (cap.supplementaryData?.relatedIds?.orderId &&
      cap.supplementaryData.relatedIds.orderId !== op.orderId)
  )
    throw new AppError('Capture integrity verification failed.', 409, 'INTEGRITY_MISMATCH');
  // Association is proven by the exact capture ID in the validated single-unit order;
  // the optional related order ID, when supplied, must agree as well.
  const fee = cap.sellerReceivableBreakdown?.paypalFee;
  const platform = cap.sellerReceivableBreakdown?.platformFees || [];
  let feeKnown = false;
  let feeCents = 0;
  try {
    if (
      fee?.value &&
      fee.currencyCode === 'USD' &&
      platform.every((f) => f.amount.currencyCode === 'USD')
    ) {
      feeCents = minor(fee.value) + platform.reduce((n, f) => n + minor(f.amount.value), 0);
      const net = cap.sellerReceivableBreakdown?.netAmount;
      feeKnown = !net || (net.currencyCode === 'USD' && minor(net.value) === ob.cents - feeCents);
    }
  } catch {
    feeKnown = false;
  }
  if (!feeKnown) feeCents = 0;
  const [previous] = await db.select().from(s.captures).where(eq(s.captures.operationId, op.id));
  if (previous && previous.providerId !== cap.id)
    throw new AppError('Capture identity changed.', 409, 'INTEGRITY_MISMATCH');
  const providerTime = cap.updateTime ? new Date(cap.updateTime) : null;
  if (providerTime && !Number.isFinite(providerTime.getTime()))
    throw new AppError('Invalid provider timestamp.', 502);
  if (previous?.providerUpdatedAt && (!providerTime || providerTime < previous.providerUpdatedAt))
    throw new AppError('Older provider evidence rejected.', 409, 'STALE_PROVIDER_EVIDENCE');
  const refunds = await db
    .select()
    .from(s.refunds)
    .where(eq(s.refunds.captureId, previous?.id || ''));
  // Order refund list permits recovery after PayPal succeeded but the response was lost.
  const refundIds = new Set([
    ...(refundHint ? [refundHint] : []),
    ...(pu.payments?.refunds || []).map((r) => r.id).filter((v): v is string => !!v),
    ...refunds.map((r) => r.providerId).filter((v): v is string => !!v),
  ]);
  const verifiedRefunds: { id: string; status: string; cents: number; claimId?: string }[] = [];
  for (const id of refundIds) {
    const r = await paypal.refundRead(id);
    const claim = refunds.find((x) => x.providerId === id || (r.customId && x.id === r.customId));
    const up = r.links?.find((l) => l.rel === 'up')?.href;
    const associated =
      up === `https://api.sandbox.paypal.com/v2/payments/captures/${cap.id}` ||
      up === `https://api-m.sandbox.paypal.com/v2/payments/captures/${cap.id}`;
    if (
      r.id !== id ||
      !r.status ||
      r.amount?.currencyCode !== 'USD' ||
      (!associated && !(pu.payments?.refunds || []).some((x) => x.id === id)) ||
      (claim && minor(r.amount.value) !== claim.cents)
    )
      throw new AppError('Refund integrity verification failed.', 409, 'INTEGRITY_MISMATCH');
    verifiedRefunds.push({
      id,
      status: claim?.status === 'COMPLETED' ? 'COMPLETED' : r.status,
      cents: minor(r.amount.value),
      claimId: claim?.id,
    });
  }
  let refundedCents = verifiedRefunds
    .filter((r) => r.status === 'COMPLETED')
    .reduce((n, r) => n + r.cents, 0);
  refundedCents = Math.max(refundedCents, previous?.refundedCents || 0);
  if (cap.status === 'REFUNDED' || String(cap.status) === 'REVERSED') refundedCents = ob.cents;
  if (refundedCents > ob.cents)
    throw new AppError('Refund total exceeds capture.', 409, 'INTEGRITY_MISMATCH');
  let pendingRefundCents = verifiedRefunds
    .filter((r) => !['COMPLETED', 'FAILED', 'CANCELLED'].includes(r.status))
    .reduce((n, r) => n + r.cents, 0);
  for (const r of refunds)
    if (
      !verifiedRefunds.some((v) => v.claimId === r.id) &&
      !['FAILED', 'CANCELLED', 'COMPLETED'].includes(r.status)
    )
      pendingRefundCents += r.cents;
  if (cap.status === 'PARTIALLY_REFUNDED' && refundedCents === 0) pendingRefundCents = ob.cents;
  pendingRefundCents = Math.min(ob.cents - refundedCents, pendingRefundCents);
  const rawStatus = String(cap.status);
  const providerStatus = ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'REVERSED'].includes(
    rawStatus,
  )
    ? rawStatus
    : ['DECLINED', 'FAILED'].includes(rawStatus)
      ? 'FAILED'
      : 'PENDING';
  let status = captureReadbackState(previous?.status || '', providerStatus);
  if (refundedCents === ob.cents) status = status === 'REVERSED' ? 'REVERSED' : 'REFUNDED';
  else if (refundedCents > 0) status = 'PARTIALLY_REFUNDED';
  const effectiveFeeKnown = feeKnown || !!previous?.feeKnown;
  const effectiveFee = feeKnown ? feeCents : previous?.feeCents || 0;
  return db.transaction(async (tx) => {
    // Win the compare-and-swap BEFORE touching captures/refunds. Rollback is atomic.
    const [saved] = await tx
      .update(s.operations)
      .set({
        status: pendingRefundCents > 0 ? 'REFUND_PENDING' : status,
        version: sql`${s.operations.version}+1`,
        captureRequestedAt: op.captureRequestedAt || new Date(),
        updatedAt: new Date(),
        errorCode: effectiveFeeKnown ? null : 'FEE_ACCOUNTING_PENDING',
      })
      .where(and(eq(s.operations.id, op.id), eq(s.operations.version, op.version)))
      .returning();
    if (!saved) throw conflict();
    await tx
      .insert(s.captures)
      .values({
        id: uid(),
        operationId: op.id,
        providerId: cap.id!,
        cents: ob.cents,
        feeCents: effectiveFee,
        feeKnown: effectiveFeeKnown,
        provenance: 'PAYPAL_SANDBOX',
        verifiedAt: new Date(),
        providerUpdatedAt: providerTime,
        status,
        refundedCents,
        pendingRefundCents,
      })
      .onConflictDoUpdate({
        target: s.captures.operationId,
        set: {
          status,
          feeCents: effectiveFee,
          feeKnown: effectiveFeeKnown,
          provenance: 'PAYPAL_SANDBOX',
          verifiedAt: new Date(),
          providerUpdatedAt: providerTime,
          refundedCents,
          pendingRefundCents,
        },
      });
    for (const r of verifiedRefunds)
      if (r.claimId)
        await tx
          .update(s.refunds)
          .set({ status: r.status, providerId: r.id, verifiedAt: new Date() })
          .where(eq(s.refunds.id, r.claimId));
    return saved;
  });
}
export async function capturePayment(a: Actor, obligationId: string) {
  const ob = await ownObligation(a, obligationId);
  const [op] = await db
    .select()
    .from(s.operations)
    .where(eq(s.operations.obligationId, obligationId));
  requireValue(op);
  if (op.mode !== a.mode) throw new AppError('Provider mode mismatch', 409);
  if (a.mode === 'demo') {
    if (op.status === 'COMPLETED') return op;
    if (['REFUNDED', 'PARTIALLY_REFUNDED', 'REVERSED'].includes(op.status))
      throw new AppError('This capture cannot be repeated.', 409);
    await db.transaction(async (tx) => {
      await tx
        .insert(s.captures)
        .values({
          id: uid(),
          operationId: op.id,
          providerId: `SIM-${op.id}`,
          cents: ob.cents,
          feeCents: 85,
          feeKnown: true,
          provenance: 'SYNTHETIC',
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
  if (['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'REVERSED'].includes(current.status))
    return current;
  if (current.status !== 'APPROVED' || current.captureRequestedAt)
    throw new AppError(
      'Buyer approval is required. An attempted capture can only be reconciled.',
      409,
    );
  const [claim] = await db
    .update(s.operations)
    .set({
      status: 'CAPTURING',
      captureRequestedAt: new Date(),
      captureKey: uid(),
      version: sql`${s.operations.version}+1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(s.operations.id, op.id),
        eq(s.operations.version, current.version),
        eq(s.operations.status, 'APPROVED'),
        isNull(s.operations.captureRequestedAt),
      ),
    )
    .returning();
  if (!claim) throw new AppError('Capture already claimed. Reconcile.', 409);
  try {
    await paypal.capture(requireValue(claim.orderId), requireValue(claim.captureKey));
    const result = await settleOperation(op.id);
    await record(a, 'PAYPAL_CAPTURE_READBACK', op.id);
    return result;
  } catch (e) {
    await db
      .update(s.operations)
      .set({
        status: e instanceof ProviderFailure && !e.ambiguous ? 'FAILED' : 'UNKNOWN',
        version: sql`${s.operations.version}+1`,
        errorCode: e instanceof AppError ? e.code : 'CAPTURE_UNKNOWN',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(s.operations.id, op.id),
          eq(s.operations.version, claim.version),
          eq(s.operations.status, 'CAPTURING'),
        ),
      );
    try {
      const result = await settleOperation(op.id);
      if (['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'REVERSED'].includes(result.status))
        return result;
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
  if (op.mode !== a.mode) throw new AppError('Provider mode mismatch', 409);
  const result = await settleOperation(op.id);
  await record(a, 'PAYMENT_RECONCILED', op.id);
  return result;
}
export async function refundPayment(
  a: Actor,
  captureId: string,
  cents?: number,
  clientKey = `full-${captureId}`,
) {
  roles(a, ['finance']);
  const [cap] = await db.select().from(s.captures).where(eq(s.captures.id, captureId));
  requireValue(cap);
  const [op] = await db.select().from(s.operations).where(eq(s.operations.id, cap.operationId));
  requireValue(op);
  await ownObligation(a, op.obligationId);
  if (
    op.mode !== a.mode ||
    (a.mode === 'sandbox' && (cap.provenance !== 'PAYPAL_SANDBOX' || !cap.verifiedAt))
  )
    throw new AppError('Verified capture and matching mode required.', 409);
  const amount = cents ?? cap.cents;
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > cap.cents ||
    !clientKey ||
    clientKey.length > 150
  )
    throw new AppError('Invalid refund amount or identity.');
  // Lock the parent operation in the same order as reconciliation, then its capture.
  const claim = await db.transaction(async (tx) => {
    await tx.select().from(s.operations).where(eq(s.operations.id, op.id)).for('update');
    const [fresh] = await tx
      .select()
      .from(s.captures)
      .where(eq(s.captures.id, cap.id))
      .for('update');
    const existing = await tx.select().from(s.refunds).where(eq(s.refunds.captureId, captureId));
    const repeated = existing.find((r) => r.clientKey === clientKey);
    if (repeated) {
      if (repeated.cents !== amount)
        throw new AppError('Refund identity reused with another amount.', 409);
      return { ...repeated, repeated: true };
    }
    const reserved = existing
      .filter((r) => !['COMPLETED', 'FAILED', 'CANCELLED'].includes(r.status))
      .reduce((n, r) => n + r.cents, 0);
    if (
      !['COMPLETED', 'PARTIALLY_REFUNDED'].includes(fresh.status) ||
      amount > fresh.cents - fresh.refundedCents - reserved
    )
      throw new AppError('Refund exceeds unreserved captured balance.', 409);
    const [r] = await tx
      .insert(s.refunds)
      .values({
        id: uid(),
        captureId,
        clientKey,
        requestKey: uid(),
        status: 'REQUESTED',
        cents: amount,
        authorizedBy: a.userId,
      })
      .returning();
    await tx
      .update(s.captures)
      .set({ pendingRefundCents: reserved + amount })
      .where(eq(s.captures.id, cap.id));
    await tx
      .update(s.operations)
      .set({ status: 'REFUND_PENDING', version: sql`${s.operations.version}+1` })
      .where(eq(s.operations.id, op.id));
    await tx.insert(s.audit).values({
      id: uid(),
      schoolId: a.schoolId,
      userId: a.userId,
      action: a.mode === 'demo' ? 'SIMULATED_REFUND_AUTHORIZED' : 'REFUND_AUTHORIZED',
      entityId: r.id,
      detail: { cents: amount },
    });
    return { ...r, repeated: false };
  });
  if (claim.repeated) return { status: claim.status, duplicate: true };
  if (a.mode === 'demo') {
    await db.transaction(async (tx) => {
      await tx.select().from(s.operations).where(eq(s.operations.id, op.id)).for('update');
      const [fresh] = await tx
        .select()
        .from(s.captures)
        .where(eq(s.captures.id, cap.id))
        .for('update');
      const total = fresh.refundedCents + amount;
      const status = total === cap.cents ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      await tx
        .update(s.refunds)
        .set({ status: 'COMPLETED', providerId: `SIM-REFUND-${claim.id}` })
        .where(eq(s.refunds.id, claim.id));
      await tx
        .update(s.captures)
        .set({
          status,
          refundedCents: total,
          pendingRefundCents: fresh.pendingRefundCents - amount,
        })
        .where(eq(s.captures.id, cap.id));
      await tx
        .update(s.operations)
        .set({
          status: fresh.pendingRefundCents > amount ? 'REFUND_PENDING' : status,
          version: sql`${s.operations.version}+1`,
        })
        .where(eq(s.operations.id, op.id));
    });
    return { status: 'COMPLETED' };
  }
  try {
    const result = await paypal.refund(cap.providerId, claim.requestKey, amount, claim.id);
    if (!result.id) throw new ProviderFailure(true, 'MISSING_REFUND_ID');
    // A POST response is identification evidence only; GET readback determines completion.
    await db
      .update(s.refunds)
      .set({ providerId: result.id, status: 'PENDING' })
      .where(and(eq(s.refunds.id, claim.id), eq(s.refunds.status, 'REQUESTED')));
    await settleOperation(op.id);
    const [verified] = await db.select().from(s.refunds).where(eq(s.refunds.id, claim.id));
    return { status: verified.status };
  } catch (e) {
    await db.transaction(async (tx) => {
      await tx.select().from(s.operations).where(eq(s.operations.id, op.id)).for('update');
      await tx
        .update(s.refunds)
        .set({ status: e instanceof ProviderFailure && !e.ambiguous ? 'FAILED' : 'UNKNOWN' })
        .where(and(eq(s.refunds.id, claim.id), isNull(s.refunds.verifiedAt)));
      await tx
        .update(s.operations)
        .set({ version: sql`${s.operations.version}+1` })
        .where(eq(s.operations.id, op.id));
    });
    throw e;
  }
}

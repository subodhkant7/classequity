import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { and, eq } from 'drizzle-orm';
import { db, closeDatabase } from '../src/db';
import * as s from '../src/db/schema';
import { paypal, ProviderFailure } from '../src/server/integrations/paypal';
import { minor } from '../src/lib/domain';
import type { Order } from '@paypal/paypal-server-sdk';
// One explicitly authorized fictional obligation. No new order, buyer login or live payment.
if (
  process.env.PAYPAL_ENV !== 'sandbox' ||
  process.env.CE_AUTHORIZED_SANDBOX_CENTS !== '100' ||
  process.env.CE_AUTHORIZED_FULL_REFUND !== 'true'
)
  throw Error('Explicit one-dollar sandbox lifecycle authorization required');
const base = process.env.APP_URL || 'http://localhost:3000';
assert.equal(new URL(base).hostname, 'localhost');
const evidence: Record<string, unknown> = {
  checkedAt: new Date().toISOString(),
  provider: 'genuine PayPal sandbox; no provider fakes',
  fictionalObligation: 'Avery Sandbox Closure Example — Financial closure verification',
  currency: 'USD',
  cents: 100,
  authorization:
    'User explicitly confirmed human buyer approval and authorized one $1 capture, duplicate-request check and one full refund up to $1',
  captureVerified: false,
  refundVerified: false,
  genuineWebhookDeliveryVerified: false,
  stages: [],
};
let stage = 'validate-target';
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
function checkpoint(name: string, data: Record<string, unknown>) {
  (evidence.stages as unknown[]).push({
    stage: name,
    checkedAt: new Date().toISOString(),
    ...data,
  });
}
async function save() {
  await writeFile(
    'docs/financial-lifecycle-evidence.json',
    JSON.stringify(evidence, null, 2) + '\n',
  );
}
async function main() {
  try {
    const previous = JSON.parse(await readFile('docs/financial-lifecycle-evidence.json', 'utf8'));
    if (previous.captureVerified === true && previous.refundVerified === true) {
      console.log(
        'This authorized lifecycle is already verified. Preserving evidence; no financial requests repeated.',
      );
      return;
    }
  } catch {}
  const handoff = JSON.parse(await readFile('.data/financial-closure-checkout.json', 'utf8'));
  const [op] = await db.select().from(s.operations).where(eq(s.operations.id, handoff.operationId));
  assert(op && op.mode === 'sandbox' && op.schoolId === 'sandbox-school' && op.orderId);
  const [ob] = await db.select().from(s.obligations).where(eq(s.obligations.id, op.obligationId));
  assert(
    ob &&
      ob.id === handoff.obligationId &&
      ob.tripId === handoff.tripId &&
      ob.cents === 100 &&
      ob.kind === 'SEAT',
  );
  const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, ob.tripId));
  assert.equal(trip.state, 'FROZEN');
  const [registration] = await db
    .select()
    .from(s.registrations)
    .where(eq(s.registrations.id, ob.registrationId!));
  assert.equal(registration.student, 'Avery Sandbox Closure Example');
  const checkOrder = (order: Order) => {
    assert.equal(order.id, op.orderId);
    assert.equal(order.purchaseUnits?.length, 1);
    const pu = order.purchaseUnits![0];
    assert.equal(pu.customId, ob.id);
    assert.equal(pu.amount?.currencyCode, 'USD');
    assert.equal(minor(pu.amount!.value), 100);
    return pu;
  };
  const before = await paypal.order(op.orderId);
  const beforeUnit = checkOrder(before);
  checkpoint('preflight', {
    orderStatus: before.status,
    existingProviderCaptures: beforeUnit.payments?.captures?.length || 0,
  });
  assert(
    ['APPROVED', 'COMPLETED'].includes(String(before.status)),
    'Human buyer approval has not been confirmed by PayPal',
  );
  assert((beforeUnit.payments?.captures?.length || 0) <= 1);
  const alreadyCaptured = !!beforeUnit.payments?.captures?.length;
  evidence.captureAlreadyCompletedBeforeThisRun = alreadyCaptured;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: base });
  stage = 'finance-authentication';
  assert(process.env.ADMIN_PASSWORD);
  const login = await context.request.post('/api/auth/login', {
    headers: { Origin: base },
    data: { mode: 'sandbox', role: 'finance', password: process.env.ADMIN_PASSWORD },
  });
  assert(login.ok());
  const post = async (route: string, data: unknown) => {
    const response = await context.request.post(`/api/${route}`, {
      headers: { Origin: base },
      data,
    });
    const value = await response.json();
    if (!response.ok())
      throw Object.assign(Error('ClassEquity endpoint rejected the lifecycle step'), {
        code: value.code || `HTTP_${response.status()}`,
      });
    return value;
  };
  stage = alreadyCaptured ? 'reconcile-existing-capture' : 'authorized-capture';
  if (alreadyCaptured) await post('payments/reconcile', { operationId: op.id });
  else await post('payments/capture', { obligationId: ob.id });
  const firstOrder = await paypal.order(op.orderId);
  const firstUnit = checkOrder(firstOrder);
  assert.equal(firstUnit.payments?.captures?.length, 1);
  const providerCaptureId = firstUnit.payments!.captures![0].id!;
  const capture = await paypal.captureRead(providerCaptureId);
  assert.equal(capture.id, providerCaptureId);
  assert.equal(capture.amount?.currencyCode, 'USD');
  assert.equal(minor(capture.amount!.value), 100);
  assert.equal(capture.status, 'COMPLETED');
  if (capture.supplementaryData?.relatedIds?.orderId)
    assert.equal(capture.supplementaryData.relatedIds.orderId, op.orderId);
  let [localCap] = await db.select().from(s.captures).where(eq(s.captures.operationId, op.id));
  assert(
    localCap &&
      localCap.providerId === providerCaptureId &&
      localCap.verifiedAt &&
      localCap.provenance === 'PAYPAL_SANDBOX',
  );
  assert.equal(localCap.cents, 100);
  evidence.captureVerified = true;
  checkpoint('capture-independent-readback', {
    status: capture.status,
    currency: 'USD',
    cents: 100,
    orderAssociationVerified: true,
    feeKnown: localCap.feeKnown,
    feeCents: localCap.feeKnown ? localCap.feeCents : null,
    alreadyCompletedBeforeRun: alreadyCaptured,
  });
  await save();
  stage = 'duplicate-capture-check';
  await post('payments/capture', { obligationId: ob.id });
  const duplicateOrder = await paypal.order(op.orderId);
  const duplicateUnit = checkOrder(duplicateOrder);
  assert.equal(duplicateUnit.payments?.captures?.length, 1);
  assert.equal(duplicateUnit.payments!.captures![0].id, providerCaptureId);
  const localCaps = await db.select().from(s.captures).where(eq(s.captures.operationId, op.id));
  assert.equal(localCaps.length, 1);
  checkpoint('duplicate-capture', {
    applicationRequestRepeated: true,
    providerCaptureCount: 1,
    sameProviderCapture: true,
    localCaptureCount: 1,
    additionalCharge: false,
  });
  await save();
  const page = await context.newPage();
  async function reportSnapshot(name: string) {
    const response = await context.request.get('/api/analytics');
    assert(response.ok());
    const rows = await response.json();
    const row = rows.find((r: { tripId: string }) => r.tripId === trip.id);
    assert(row);
    await page.goto(`${base}/analytics`);
    await page.getByRole('button', { name: 'Restore starter report' }).click();
    await page.getByLabel('Report page').selectOption('Group pricing progress');
    await expect(page.locator('.ag-root').first()).toBeVisible({ timeout: 30000 });
    await expect(
      page.locator('.ag-root').first().getByText(trip.name, { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    const safe = {
      capturedCents: row.capturedCents,
      feeCents: row.feeCents,
      feePending: row.feePending,
      refundCents: row.refundCents,
      netCents: row.netCents,
      gapCents: row.gapCents,
      parentPaidSeats: row.parentPaidSeats,
      coveredSeats: row.confirmedSeats,
      ready: row.ready,
      simulation: row.simulation,
    };
    assert.equal(row.simulation, false);
    checkpoint(name, { ...safe, actualStudioGridRendered: true });
    await save();
    return row;
  }
  stage = 'studio-captured';
  const capturedRow = await reportSnapshot('studio-after-capture');
  assert.equal(capturedRow.capturedCents, 100);
  assert.equal(capturedRow.parentPaidSeats, 1);
  stage = 'authorized-full-refund';
  await post('payments/refund', {
    captureId: localCap.id,
    cents: 100,
    clientKey: `${localCap.id}-authorized-closure-full-v1`,
  });
  for (let attempt = 0; attempt < 6; attempt++) {
    await post('payments/reconcile', { operationId: op.id });
    [localCap] = await db.select().from(s.captures).where(eq(s.captures.id, localCap.id));
    const refunds = await db.select().from(s.refunds).where(eq(s.refunds.captureId, localCap.id));
    assert.equal(refunds.length, 1);
    const refund = refunds[0];
    if (refund.providerId) {
      const providerRefund = await paypal.refundRead(refund.providerId);
      assert.equal(providerRefund.id, refund.providerId);
      assert.equal(providerRefund.amount?.currencyCode, 'USD');
      assert.equal(minor(providerRefund.amount!.value), 100);
      if (
        providerRefund.status === 'COMPLETED' &&
        refund.verifiedAt &&
        refund.status === 'COMPLETED'
      ) {
        assert.equal(localCap.refundedCents, 100);
        assert.equal(localCap.pendingRefundCents, 0);
        evidence.refundVerified = true;
        checkpoint('refund-independent-readback', {
          status: providerRefund.status,
          currency: 'USD',
          cents: 100,
          localRefundCount: 1,
          localRefundedCents: 100,
          pendingRefundCents: 0,
        });
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  await save();
  assert.equal(
    evidence.refundVerified,
    true,
    'Refund remains unresolved; no repeat mutation is permitted',
  );
  stage = 'studio-refunded';
  const refundedRow = await reportSnapshot('studio-after-refund');
  assert.equal(refundedRow.refundCents, 100);
  assert.equal(refundedRow.parentPaidSeats, 0);
  assert.equal(refundedRow.confirmedSeats, 0);
  assert.equal(refundedRow.netCents, capturedRow.netCents - 100);
  const finalOrder = await paypal.order(op.orderId);
  const finalUnit = checkOrder(finalOrder);
  assert.equal(finalUnit.payments?.captures?.length, 1);
  assert.equal(finalUnit.payments!.captures![0].id, providerCaptureId);
  const [finalOp] = await db
    .select()
    .from(s.operations)
    .where(and(eq(s.operations.id, op.id), eq(s.operations.schoolId, 'sandbox-school')));
  assert.equal(finalOp.status, 'REFUNDED');
  checkpoint('final-ledger', {
    operationStatus: finalOp.status,
    captureCount: 1,
    capturedCents: 100,
    refundedCents: 100,
    feesRetainedCents: localCap.feeKnown ? localCap.feeCents : null,
    remainingCapturableObligation: false,
  });
  evidence.status =
    'SANDBOX VERIFIED — capture, duplicate request, full refund and actual Studio refresh';
  await save();
  console.log({
    status: evidence.status,
    cents: 100,
    captureAlreadyCompletedBeforeThisRun: alreadyCaptured,
    captureVerified: true,
    refundVerified: true,
    providerCaptureCount: 1,
    genuineWebhookDeliveryVerified: false,
  });
}
try {
  await main();
} catch (e) {
  evidence.status = 'PARTIAL OR BLOCKED';
  evidence.blockedStage = stage;
  evidence.errorCode =
    e instanceof ProviderFailure
      ? e.providerCode
      : typeof e === 'object' && e && 'code' in e
        ? e.code
        : 'LIFECYCLE_CHECK_FAILED';
  await save();
  await mkdir('.data', { recursive: true });
  await writeFile(
    '.data/financial-lifecycle-error.txt',
    e instanceof Error ? e.stack || e.message : String(e),
    { mode: 0o600 },
  );
  console.error({
    status: evidence.status,
    stage,
    code: evidence.errorCode,
    captureVerified: evidence.captureVerified,
    refundVerified: evidence.refundVerified,
  });
  process.exitCode = 1;
} finally {
  await browser?.close();
  await closeDatabase();
}

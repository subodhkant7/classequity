import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { eq, and } from 'drizzle-orm';
import { request, chromium, expect } from '@playwright/test';
import { db, closeDatabase } from '../src/db';
import * as s from '../src/db/schema';
import { paypal, accessToken } from '../src/server/integrations/paypal';
import { minor, money } from '../src/lib/domain';
import type { Order } from '@paypal/paypal-server-sdk';

// A single explicitly authorized, already buyer-approved USD 1 sandbox obligation.
// Durable local attempt markers supplement the server's irreversible mutation claims.
const base = 'https://classequity.onrender.com';
const path = '.data/hosted/authorized-financial-state.json';
const evidencePath = 'docs/hosted-financial-lifecycle-evidence.json';
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
let stage = 'preflight';
let state: { captureAttempted?: boolean; duplicateAttempted?: boolean; refundAttempted?: boolean } =
  {};
let evidence: Record<string, unknown> = {};
async function save() {
  await writeFile(path, JSON.stringify(state, null, 2), { mode: 0o600 });
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
}
function note(name: string, data: Record<string, unknown>) {
  (evidence.stages as unknown[]).push({
    stage: name,
    checkedAt: new Date().toISOString(),
    ...data,
  });
}
async function main() {
  assert.equal(process.env.PAYPAL_ENV, 'sandbox');
  assert.equal(process.env.APP_URL, base);
  assert.equal(process.env.CE_AUTHORIZED_HOSTED_CAPTURE, '100');
  assert.equal(process.env.CE_AUTHORIZED_HOSTED_REFUND, '100');
  const action = process.argv[2];
  assert(['capture', 'refund', 'events', 'report'].includes(action));
  try {
    state = JSON.parse(await readFile(path, 'utf8'));
  } catch {}
  try {
    evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
  } catch {
    evidence = {
      checkedAt: new Date().toISOString(),
      fictionalObligation: 'Morgan Sandbox Webhook Example — Hosted webhook verification',
      currency: 'USD',
      cents: 100,
      authorization:
        'User explicitly authorized one USD 1 sandbox capture, idempotent duplicate-request check and one full refund up to USD 1',
      captureVerified: false,
      refundVerified: false,
      stages: [],
    };
  }
  const prepared = JSON.parse(await readFile('.data/hosted/checkout.json', 'utf8'));
  const original = JSON.parse(await readFile('.data/financial-closure-checkout.json', 'utf8'));
  assert.notEqual(prepared.operationId, original.operationId);
  const [op] = await db
    .select()
    .from(s.operations)
    .where(eq(s.operations.id, prepared.operationId));
  assert(op && op.mode === 'sandbox' && op.schoolId === 'sandbox-school' && op.orderId);
  const [ob] = await db.select().from(s.obligations).where(eq(s.obligations.id, op.obligationId));
  assert(
    ob &&
      ob.id === prepared.obligationId &&
      ob.tripId === prepared.tripId &&
      ob.kind === 'SEAT' &&
      ob.cents === 100,
  );
  const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, ob.tripId));
  assert.equal(trip.name, 'Hosted webhook verification');
  assert.equal(trip.state, 'FROZEN');
  const [reg] = await db
    .select()
    .from(s.registrations)
    .where(eq(s.registrations.id, ob.registrationId!));
  assert.equal(reg.student, 'Morgan Sandbox Webhook Example');
  const unit = (order: Order) => {
    assert.equal(order.id, op.orderId);
    assert.equal(order.purchaseUnits?.length, 1);
    const p = order.purchaseUnits![0];
    assert.equal(p.customId, ob.id);
    assert.equal(p.amount?.currencyCode, 'USD');
    assert.equal(minor(p.amount!.value), 100);
    assert((p.payments?.captures?.length || 0) <= 1);
    return p;
  };
  const http = await request.newContext({ baseURL: base, timeout: 60000 });
  try {
    assert(process.env.ADMIN_PASSWORD);
    const login = await http.post('/api/auth/login', {
      headers: { Origin: base },
      data: { mode: 'sandbox', role: 'finance', password: process.env.ADMIN_PASSWORD },
    });
    assert(login.ok());
    const post = async (route: string, data: unknown) => {
      const response = await http.post('/api/' + route, { headers: { Origin: base }, data });
      const value = await response.json();
      if (!response.ok())
        throw Object.assign(Error('Hosted financial endpoint rejected the request'), {
          code: value.code || `HTTP_${response.status()}`,
        });
      return value;
    };
    const readback = async () => {
      const p = unit(await paypal.order(op.orderId!));
      if (!p.payments?.captures?.[0]?.id) return null;
      const cap = await paypal.captureRead(p.payments.captures[0].id);
      assert.equal(cap.id, p.payments.captures[0].id);
      assert.equal(cap.amount?.currencyCode, 'USD');
      assert.equal(minor(cap.amount!.value), 100);
      const [local] = await db.select().from(s.captures).where(eq(s.captures.operationId, op.id));
      return { provider: cap, local };
    };
    if (action === 'capture') {
      const before = await paypal.order(op.orderId);
      const p = unit(before);
      note('capture-preflight', {
        providerStatus: before.status,
        providerCaptureCount: p.payments?.captures?.length || 0,
      });
      if (!p.payments?.captures?.length) {
        assert.equal(before.status, 'APPROVED');
        assert(
          !state.captureAttempted && !op.captureRequestedAt,
          'A capture attempt may only be recovered by readback.',
        );
        state.captureAttempted = true;
        await save();
        stage = 'authorized-capture';
        try {
          await post('payments/capture', { obligationId: ob.id });
        } catch (e) {
          note('capture-response', { unresolvedResponse: true, code: errorCode(e) });
        }
      }
      let cap = await readback();
      assert(cap, 'Capture is not visible. Do not repeat the financial mutation.');
      if (!cap.local?.verifiedAt) {
        await post('payments/reconcile', { operationId: op.id });
        cap = await readback();
      }
      assert(cap?.local?.verifiedAt && cap.local.provenance === 'PAYPAL_SANDBOX');
      assert.equal(cap.provider.status, 'COMPLETED');
      assert.equal(cap.local.cents, 100);
      evidence.captureVerified = true;
      note('capture-independent-readback', {
        cents: 100,
        currency: 'USD',
        status: cap.provider.status,
        feeKnown: cap.local.feeKnown,
        feeCents: cap.local.feeKnown ? cap.local.feeCents : null,
        captureFingerprint: hash(cap.provider.id!),
      });
      await save();
      if (!state.duplicateAttempted) {
        stage = 'authorized-idempotent-duplicate-check';
        state.duplicateAttempted = true;
        await save();
        await post('payments/capture', { obligationId: ob.id });
        const repeated = unit(await paypal.order(op.orderId));
        assert.equal(repeated.payments?.captures?.length, 1);
        assert.equal(repeated.payments!.captures![0].id, cap.provider.id);
        const local = await db.select().from(s.captures).where(eq(s.captures.operationId, op.id));
        assert.equal(local.length, 1);
        note('duplicate-capture-request', {
          providerCaptureCount: 1,
          sameProviderCapture: true,
          localCaptureCount: 1,
          additionalCharge: false,
        });
      }
    }
    if (action === 'refund') {
      const cap = await readback();
      assert(cap?.local && evidence.captureVerified === true);
      const existing = await db
        .select()
        .from(s.refunds)
        .where(eq(s.refunds.captureId, cap.local.id));
      if (!existing.length) {
        assert(!state.refundAttempted, 'A refund attempt may only be recovered by readback.');
        assert.equal(cap.local.refundedCents, 0);
        assert.equal(cap.local.pendingRefundCents, 0);
        assert.equal(cap.provider.status, 'COMPLETED');
        state.refundAttempted = true;
        await save();
        stage = 'authorized-full-refund';
        try {
          await post('payments/refund', {
            captureId: cap.local.id,
            cents: 100,
            clientKey: `hosted-authorized-full-v1-${cap.local.id}`,
          });
        } catch (e) {
          note('refund-response', { unresolvedResponse: true, code: errorCode(e) });
        }
      }
      let verified = false;
      for (let i = 0; i < 6; i++) {
        try {
          await post('payments/reconcile', { operationId: op.id });
        } catch (e) {
          note('readback-retry', { code: errorCode(e) });
        }
        const [fresh] = await db.select().from(s.captures).where(eq(s.captures.id, cap.local.id));
        const refunds = await db
          .select()
          .from(s.refunds)
          .where(eq(s.refunds.captureId, cap.local.id));
        assert.equal(refunds.length, 1);
        const refund = refunds[0];
        assert.equal(refund.cents, 100);
        if (refund.providerId) {
          const remote = await paypal.refundRead(refund.providerId);
          assert.equal(remote.amount?.currencyCode, 'USD');
          assert.equal(minor(remote.amount!.value), 100);
          if (remote.status === 'COMPLETED' && refund.status === 'COMPLETED' && refund.verifiedAt) {
            assert.equal(fresh.refundedCents, 100);
            assert.equal(fresh.pendingRefundCents, 0);
            verified = true;
            evidence.refundVerified = true;
            note('refund-independent-readback', {
              currency: 'USD',
              cents: 100,
              status: remote.status,
              localRefundCount: 1,
              refundedCents: fresh.refundedCents,
              pendingRefundCents: fresh.pendingRefundCents,
              feeKnown: fresh.feeKnown,
              retainedFeeCents: fresh.feeKnown ? fresh.feeCents : null,
              refundFingerprint: hash(refund.providerId),
            });
            break;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      assert(verified, 'Refund unresolved. Do not repeat the financial mutation.');
    }
    if (action === 'events') {
      const token = await accessToken();
      const response = await fetch(
        'https://api-m.sandbox.paypal.com/v1/notifications/webhooks-events?page_size=100',
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) },
      );
      assert(response.ok);
      const data = await response.json();
      const caps = await db.select().from(s.captures).where(eq(s.captures.operationId, op.id));
      const refunds = caps[0]
        ? await db.select().from(s.refunds).where(eq(s.refunds.captureId, caps[0].id))
        : [];
      const hook = JSON.parse(await readFile('.data/hosted/paypal-webhook.json', 'utf8'));
      const audits = await db.select().from(s.audit).where(eq(s.audit.entityId, op.id));
      const events = [];
      for (const e of data.events || []) {
        const related = e.resource?.supplementary_data?.related_ids;
        if (!(
          e.resource?.id === op.orderId ||
          related?.order_id === op.orderId ||
          caps.some((c) => c.providerId === e.resource?.id) ||
          refunds.some((r) => r.providerId === e.resource?.id)
        ))
          continue;
        const [inbox] = await db
          .select()
          .from(s.inbox)
          .where(and(eq(s.inbox.provider, 'paypal'), eq(s.inbox.eventId, e.id)));
        const audit = audits.find(
          (a) =>
            a.action === 'PAYPAL_WEBHOOK_RECONCILED' &&
            (a.detail as Record<string, unknown>).eventFingerprint === hash(e.id),
        );
        const detail = audit?.detail as Record<string, unknown> | undefined;
        events.push({
          type: e.event_type,
          eventFingerprint: hash(e.id),
          createdAt: e.create_time,
          inboxStatus: inbox?.status || null,
          attempts: inbox?.attempts || 0,
          errorCode: inbox?.errorCode || null,
          signature: detail?.signature || null,
          correctOperation: audit?.entityId === op.id,
          correctWebhook: detail?.webhookFingerprint === hash(hook.id),
          receivedDigestMatchesAudit: !!inbox && detail?.bodyHash === inbox.bodyHash,
          readbackStatus: detail?.readbackStatus || null,
        });
      }
      evidence.events = events;
      console.log(JSON.stringify({ events }, null, 2));
    }
    if (action === 'report') {
      const result = await http.get('/api/analytics');
      assert(result.ok());
      const row = (await result.json()).find((r: { tripId: string }) => r.tripId === trip.id);
      assert(row && !row.simulation);
      const browser = await chromium.launch({ headless: true });
      try {
        const context = await browser.newContext({
          baseURL: base,
          storageState: await http.storageState(),
        });
        const page = await context.newPage();
        await page.goto('/analytics');
        await page.getByLabel('Report page').selectOption('Payment reconciliation');
        const grid = page.locator('.ag-root').first();
        await grid.scrollIntoViewIfNeeded();
        const rendered = grid
          .getByRole('row')
          .filter({ has: page.getByRole('gridcell', { name: trip.name, exact: true }) });
        await expect(rendered).toBeVisible({ timeout: 30000 });
        await expect(
          rendered.getByRole('gridcell', { name: money(row.netCents), exact: true }).first(),
        ).toBeVisible();
        await expect(
          page
            .locator('.studio-frame')
            .getByText('Loading...', { exact: true })
            .filter({ visible: true }),
        ).toHaveCount(0, { timeout: 30000 });
        const name = row.refundCents === 100 ? 'refunded' : 'captured';
        await page
          .locator('.studio-frame')
          .screenshot({ path: `output/playwright/hosted/financial-${name}-studio.png` });
        note(`studio-${name}`, {
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
          actualNativeGridVisible: true,
          exactNetCellVisible: true,
        });
      } finally {
        await browser.close();
      }
    }
    evidence.checkedAt = new Date().toISOString();
    await save();
    console.log({
      action,
      captureVerified: evidence.captureVerified,
      refundVerified: evidence.refundVerified,
      outcome: 'Verified stage recorded; provider identifiers redacted',
    });
  } finally {
    await http.dispose();
  }
}
function errorCode(e: unknown) {
  return typeof e === 'object' && e && 'code' in e
    ? String(e.code)
        .replace(/[^A-Z0-9_]/g, '')
        .slice(0, 80)
    : 'VERIFICATION_FAILED';
}
main()
  .catch(async (e) => {
    if (evidence.stages) {
      evidence.lastFailure = { stage, code: errorCode(e) };
      await save();
    }
    console.error({
      stage,
      code: errorCode(e),
      message:
        'Stage incomplete. Readback only after a claimed mutation; never repeat capture/refund blindly.',
    });
    process.exitCode = 1;
  })
  .finally(closeDatabase);

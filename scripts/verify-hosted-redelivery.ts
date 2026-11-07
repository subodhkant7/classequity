import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, closeDatabase } from '../src/db';
import * as s from '../src/db/schema';
import { accessToken } from '../src/server/integrations/paypal';

// Genuine event resends only. No payment mutation endpoint is called here.
const privatePath = '.data/hosted/financial-redelivery.json';
const publicPath = 'docs/hosted-financial-redelivery-evidence.json';
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
async function main() {
  assert.equal(process.env.PAYPAL_ENV, 'sandbox');
  const action = process.argv[2];
  assert(['resend', 'check'].includes(action));
  const p = JSON.parse(await readFile('.data/hosted/checkout.json', 'utf8'));
  const hook = JSON.parse(await readFile('.data/hosted/paypal-webhook.json', 'utf8'));
  assert.equal(hook.url, 'https://classequity.onrender.com/api/webhooks/paypal');
  async function snapshot() {
    const [op] = await db.select().from(s.operations).where(eq(s.operations.id, p.operationId));
    assert(op && op.mode === 'sandbox' && op.status === 'REFUNDED');
    const captures = await db.select().from(s.captures).where(eq(s.captures.operationId, op.id));
    assert.equal(captures.length, 1);
    assert.equal(captures[0].cents, 100);
    assert.equal(captures[0].refundedCents, 100);
    assert.equal(captures[0].pendingRefundCents, 0);
    const refunds = await db
      .select()
      .from(s.refunds)
      .where(eq(s.refunds.captureId, captures[0].id));
    assert.equal(refunds.length, 1);
    assert.equal(refunds[0].status, 'COMPLETED');
    const audits = (await db.select().from(s.audit).where(eq(s.audit.entityId, op.id))).filter(
      (a) => a.action === 'PAYPAL_WEBHOOK_RECONCILED',
    );
    return {
      op,
      captures,
      refunds,
      safe: {
        operationStatus: op.status,
        version: op.version,
        captureCount: captures.length,
        refundCount: refunds.length,
        capturedCents: captures[0].cents,
        refundedCents: captures[0].refundedCents,
        feeKnown: captures[0].feeKnown,
        feeCents: captures[0].feeCents,
        pendingRefundCents: captures[0].pendingRefundCents,
        reconciliationAuditCount: audits.length,
        ledgerFingerprint: hash(JSON.stringify([op, captures, refunds])),
      },
    };
  }
  if (action === 'resend') {
    const before = await snapshot();
    const token = await accessToken();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const response = await fetch(
      'https://api-m.sandbox.paypal.com/v1/notifications/webhooks-events?page_size=100',
      { headers, signal: AbortSignal.timeout(20000) },
    );
    assert(response.ok);
    const list = z
      .object({
        events: z.array(
          z.object({
            id: z.string(),
            event_type: z.string(),
            resource: z.object({
              id: z.string(),
              supplementary_data: z
                .object({ related_ids: z.object({ order_id: z.string().optional() }) })
                .optional(),
            }),
          }),
        ),
      })
      .parse(await response.json());
    const startedAt = new Date().toISOString();
    const events = [];
    for (const type of ['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.REFUNDED']) {
      const event = list.events.find(
        (e) =>
          e.event_type === type &&
          (e.resource.supplementary_data?.related_ids.order_id === before.op.orderId ||
            e.resource.id === before.captures[0].providerId ||
            e.resource.id === before.refunds[0].providerId),
      );
      assert(event);
      const [inbox] = await db
        .select()
        .from(s.inbox)
        .where(and(eq(s.inbox.provider, 'paypal'), eq(s.inbox.eventId, event.id)));
      assert.equal(inbox?.status, 'PROCESSED');
      const r = await fetch(
        'https://api-m.sandbox.paypal.com/v1/notifications/webhooks-events/' +
          encodeURIComponent(event.id) +
          '/resend',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ webhook_ids: [hook.id] }),
          signal: AbortSignal.timeout(25000),
        },
      );
      assert.equal(r.status, 202);
      events.push({
        type,
        eventFingerprint: hash(event.id),
        resendHttpStatus: r.status,
        inboxAttemptsBefore: inbox.attempts,
        bodyHash: inbox.bodyHash,
      });
    }
    const evidence = {
      startedAt,
      scope:
        'Real completed capture event replayed after full refund, plus real refund event replay',
      before: before.safe,
      events,
      captureOrRefundRequested: false,
      deliveryConfirmed: false,
    };
    await writeFile(privatePath, JSON.stringify(evidence, null, 2), { mode: 0o600 });
    await writeFile(publicPath, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } else {
    const evidence = JSON.parse(await readFile(privatePath, 'utf8'));
    const after = await snapshot();
    assert.deepEqual(after.safe, evidence.before);
    for (const event of evidence.events) {
      const rows = await db.select().from(s.inbox).where(eq(s.inbox.provider, 'paypal'));
      const inbox = rows.find((i) => hash(i.eventId) === event.eventFingerprint);
      assert.equal(inbox?.status, 'PROCESSED');
      assert.equal(inbox.attempts, event.inboxAttemptsBefore);
      assert.equal(inbox.bodyHash, event.bodyHash);
    }
    Object.assign(evidence, {
      checkedAt: new Date().toISOString(),
      after: after.safe,
      ledgerUnchanged: true,
      stateDidNotRegressFromRefunded: true,
    });
    await writeFile(privatePath, JSON.stringify(evidence, null, 2), { mode: 0o600 });
    await writeFile(publicPath, JSON.stringify(evidence, null, 2) + '\n');
    console.log({
      ledgerUnchanged: true,
      operationStatus: after.safe.operationStatus,
      captureCount: after.safe.captureCount,
      refundCount: after.safe.refundCount,
      noFinancialMutationRequested: true,
    });
  }
}
main()
  .catch(() => {
    console.error('Redelivery verification incomplete; no capture/refund requested.');
    process.exitCode = 1;
  })
  .finally(closeDatabase);

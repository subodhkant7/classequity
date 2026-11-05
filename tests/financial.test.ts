import { afterAll, afterEach, beforeAll, describe, it, expect, vi } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { sql, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  OrderStatus,
  type Order,
  type CapturedPayment,
  type Refund,
} from '@paypal/paypal-server-sdk';
import type { Actor } from '../src/server/auth';
import { funding, seatCoverage } from '../src/lib/domain';
import { orderReadbackState, captureReadbackState } from '../src/lib/payment-state';
process.env.DATABASE_URL = '';
process.env.LOCAL_DATABASE_DIR = 'memory://';
process.env.SESSION_SECRET = 'synthetic-financial-tests-session-key';
const { db, closeDatabase } = await import('../src/db');
const s = await import('../src/db/schema');
const payments = await import('../src/server/payments');
const data = await import('../src/server/data');
const services = await import('../src/server/services');
const integration = await import('../src/server/integrations/paypal');
const { paypal, ProviderFailure } = integration;
const { paypalWebhook, boundedWebhookBody } = await import('../src/server/paypal-webhooks');
const a: Actor = {
  schoolId: 'sandbox-school',
  userId: 'sandbox-finance',
  name: 'Fictional finance',
  role: 'finance',
  mode: 'sandbox',
};
beforeAll(async () => {
  for (const file of (await readdir('drizzle')).filter((f) => f.endsWith('.sql')).sort())
    for (const part of (await readFile(`drizzle/${file}`, 'utf8')).split(
      '--> statement-breakpoint',
    ))
      if (part.trim()) await db.execute(sql.raw(part));
  await (await import('../scripts/seed')).seed();
}, 30000);
afterEach(() => vi.restoreAllMocks());
afterAll(closeDatabase);
async function fixture(status = 'APPROVED'): Promise<{ id: string; order: Order }> {
  const id = randomUUID();
  await db.insert(s.trips).values({
    id,
    schoolId: a.schoolId,
    name: 'Financial test',
    destination: 'Fictional museum',
    description: 'Financial fixture only',
    date: '2026-12-01',
    deadline: '2026-11-30',
    capacity: 1,
    tiers: [{ min: 1, cents: 1000 }],
    state: 'FROZEN',
  });
  await db
    .insert(s.snapshots)
    .values({ id, tripId: id, seatCents: 1000, count: 1, policy: [{ min: 1, cents: 1000 }] });
  await db
    .insert(s.obligations)
    .values({ id, tripId: id, snapshotId: id, userId: a.userId, kind: 'SPONSOR', cents: 1000 });
  await db.insert(s.operations).values({
    id,
    obligationId: id,
    schoolId: a.schoolId,
    mode: 'sandbox',
    requestKey: randomUUID(),
    orderId: `ORDER-${id}`,
    status,
  });
  return {
    id,
    order: {
      id: `ORDER-${id}`,
      status: OrderStatus.Approved,
      purchaseUnits: [{ customId: id, amount: { currencyCode: 'USD', value: '10.00' } }],
    },
  };
}
function captured(f: Awaited<ReturnType<typeof fixture>>, fee = true, status = 'COMPLETED') {
  const cap: CapturedPayment = {
    id: `CAP-${f.id}`,
    status: status as CapturedPayment['status'],
    amount: { currencyCode: 'USD', value: '10.00' },
    supplementaryData: { relatedIds: { orderId: f.order.id } },
    updateTime: '2026-11-04T20:00:00Z',
    ...(fee
      ? {
          sellerReceivableBreakdown: {
            grossAmount: { currencyCode: 'USD', value: '10.00' },
            paypalFee: { currencyCode: 'USD', value: '0.50' },
          },
        }
      : {}),
  };
  f.order.status = OrderStatus.Completed;
  f.order.purchaseUnits![0].payments = { captures: [{ id: cap.id }] };
  return cap;
}
function fakeReads(f: Awaited<ReturnType<typeof fixture>>, cap: CapturedPayment) {
  vi.spyOn(paypal, 'order').mockImplementation(async () => structuredClone(f.order));
  vi.spyOn(paypal, 'captureRead').mockImplementation(async () => structuredClone(cap));
}
const readOp = async (id: string) =>
  (await db.select().from(s.operations).where(eq(s.operations.id, id)))[0];
const readCap = async (id: string) =>
  (await db.select().from(s.captures).where(eq(s.captures.operationId, id)))[0];
describe('verified financial evidence and conservative coverage', () => {
  it('persists a completed capture with unknown fees as paid, with no spendable funds', async () => {
    const f = await fixture();
    const cap = captured(f, false);
    fakeReads(f, cap);
    expect((await payments.settleOperation(f.id)).status).toBe('COMPLETED');
    expect(await readCap(f.id)).toMatchObject({
      feeKnown: false,
      provenance: 'PAYPAL_SANDBOX',
      cents: 1000,
    });
    const totals = (await data.tripData(a, f.id)).totals;
    expect(totals).toMatchObject({
      gross: 1000,
      feePending: 1,
      feeReserve: 1000,
      net: 0,
      ready: false,
    });
    cap.sellerReceivableBreakdown = {
      grossAmount: { currencyCode: 'USD', value: '10.00' },
      paypalFee: { currencyCode: 'USD', value: 'malformed' },
    };
    expect((await payments.settleOperation(f.id)).status).toBe('COMPLETED');
    expect((await readCap(f.id)).feeKnown).toBe(false);
    cap.sellerReceivableBreakdown = {
      grossAmount: { currencyCode: 'USD', value: '10.00' },
      paypalFee: { currencyCode: 'USD', value: '0.50' },
    };
    await payments.settleOperation(f.id);
    expect((await data.tripData(a, f.id)).totals).toMatchObject({
      feePending: 0,
      net: 950,
      gap: 50,
    });
  });
  it('rejects wrong capture amount and order association without changing the ledger', async () => {
    const f = await fixture();
    const cap = captured(f);
    fakeReads(f, cap);
    cap.amount!.value = '10.01';
    await expect(payments.settleOperation(f.id)).rejects.toMatchObject({
      code: 'INTEGRITY_MISMATCH',
    });
    cap.amount!.value = '10.00';
    cap.supplementaryData!.relatedIds!.orderId = 'WRONG';
    await expect(payments.settleOperation(f.id)).rejects.toMatchObject({
      code: 'INTEGRITY_MISMATCH',
    });
    expect(await readCap(f.id)).toBeUndefined();
  });
  it('excludes synthetic sandbox rows and ignores a legacy unapproved reserve', async () => {
    const f = await fixture();
    await db.update(s.trips).set({ reserveCents: 999999 }).where(eq(s.trips.id, f.id));
    await db.insert(s.captures).values({
      id: f.id,
      operationId: f.id,
      providerId: `SIM-${f.id}`,
      cents: 1000,
      feeCents: 0,
      feeKnown: true,
      provenance: 'SYNTHETIC',
      status: 'COMPLETED',
    });
    expect((await data.tripData(a, f.id)).totals).toMatchObject({
      gross: 0,
      schoolCents: 0,
      net: 0,
      ready: false,
    });
  });
  it('records school treasury authorization atomically and denies teachers/cross-tenant writes', async () => {
    const f = await fixture();
    const input = {
      cents: 1000,
      source: 'Approved fictional treasury',
      evidence: 'Signed treasury allocation reference TEST-001',
    };
    await expect(
      services.schoolContribution({ ...a, role: 'teacher' }, f.id, input),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      services.schoolContribution({ ...a, schoolId: 'demo-school' }, f.id, input),
    ).rejects.toMatchObject({ status: 404 });
    const result = await services.schoolContribution(a, f.id, input);
    expect(
      (await db.select().from(s.audit).where(eq(s.audit.entityId, result.id)))[0],
    ).toMatchObject({ action: 'SCHOOL_CONTRIBUTION_ATTESTED', userId: a.userId });
    expect((await data.tripData(a, f.id)).totals.schoolCents).toBe(1000);
  });
  it('distinguishes assisted seats, parent payments and actual net coverage without reusing sponsor cash', () => {
    const seats = [
      { parentDue: 1000, paid: 1000, available: 950 },
      { parentDue: 0, paid: 0, available: 0 },
    ];
    expect(seatCoverage(1000, 1950, seats)).toEqual({
      parentPaidSeats: 1,
      fullyAssistedSeats: 1,
      coveredSeats: 1,
      unresolvedSeats: 1,
    });
    expect(seatCoverage(1000, 2000, seats).coveredSeats).toBe(2);
    expect(seatCoverage(1000, 900, seats).coveredSeats).toBe(0);
    expect(
      funding({
        seatCents: 1000,
        registrations: 2,
        assistedCents: 1000,
        sponsorCommittedCents: 1000,
        captures: [],
        unresolved: 0,
      }).net,
    ).toBe(0);
  });
  it('removes reversed money while retaining known processing costs', async () => {
    const f = await fixture();
    const cap = captured(f);
    fakeReads(f, cap);
    await payments.settleOperation(f.id);
    cap.status = 'REVERSED' as CapturedPayment['status'];
    cap.updateTime = '2026-11-04T21:00:00Z';
    await payments.settleOperation(f.id);
    expect((await data.tripData(a, f.id)).totals).toMatchObject({
      net: -50,
      refunds: 1000,
      ready: false,
    });
  });
});
describe('capture claims, stale reads, crashes and timeouts', () => {
  it('allows only one provider mutation in competing capture requests', async () => {
    const f = await fixture();
    let started!: () => void;
    const reached = new Promise<void>((r) => (started = r));
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    vi.spyOn(paypal, 'order').mockImplementation(async () => structuredClone(f.order));
    const mutate = vi.spyOn(paypal, 'capture').mockImplementation(async () => {
      started();
      await gate;
      captured(f);
      return f.order;
    });
    vi.spyOn(paypal, 'captureRead').mockImplementation(async () => captured(f));
    const first = payments.capturePayment(a, f.id);
    await reached;
    await expect(payments.capturePayment(a, f.id)).rejects.toMatchObject({ status: 409 });
    expect((await readOp(f.id)).status).toBe('CAPTURING');
    release();
    await first;
    await payments.capturePayment(a, f.id);
    expect(mutate).toHaveBeenCalledTimes(1);
  });
  it('rejects a stale no-capture read begun before capture was claimed', async () => {
    const f = await fixture();
    let release!: () => void;
    let reached!: () => void;
    const waiting = new Promise<void>((r) => (reached = r));
    const gate = new Promise<void>((r) => (release = r));
    vi.spyOn(paypal, 'order').mockImplementation(async () => {
      const old = structuredClone(f.order);
      reached();
      await gate;
      return old;
    });
    const stale = payments.settleOperation(f.id);
    await waiting;
    await db
      .update(s.operations)
      .set({
        status: 'CAPTURING',
        captureRequestedAt: new Date(),
        version: sql`${s.operations.version}+1`,
      })
      .where(eq(s.operations.id, f.id));
    release();
    await expect(stale).rejects.toMatchObject({ code: 'STALE_READBACK' });
    expect((await readOp(f.id)).status).toBe('CAPTURING');
  });
  it('recovers a crash after provider capture without making another capture call', async () => {
    const f = await fixture('CAPTURING');
    await db
      .update(s.operations)
      .set({ captureRequestedAt: new Date(), captureKey: randomUUID() })
      .where(eq(s.operations.id, f.id));
    const cap = captured(f);
    fakeReads(f, cap);
    const mutate = vi.spyOn(paypal, 'capture');
    expect((await payments.capturePayment(a, f.id)).status).toBe('COMPLETED');
    expect(mutate).not.toHaveBeenCalled();
  });
  it('keeps an ambiguous timeout closed to mutation even if readback still says APPROVED', async () => {
    const f = await fixture();
    vi.spyOn(paypal, 'order').mockImplementation(async () => structuredClone(f.order));
    const mutate = vi
      .spyOn(paypal, 'capture')
      .mockRejectedValue(new ProviderFailure(true, 'TRANSPORT'));
    await expect(payments.capturePayment(a, f.id)).rejects.toMatchObject({ ambiguous: true });
    expect((await readOp(f.id)).status).toBe('UNKNOWN');
    await expect(payments.capturePayment(a, f.id)).rejects.toMatchObject({ status: 409 });
    expect(mutate).toHaveBeenCalledTimes(1);
  });
  it('rejects older capture evidence and keeps refunded/reversed states terminal', async () => {
    const f = await fixture();
    const cap = captured(f, true, 'REFUNDED');
    fakeReads(f, cap);
    await payments.settleOperation(f.id);
    cap.status = 'COMPLETED' as CapturedPayment['status'];
    cap.updateTime = '2026-11-04T19:00:00Z';
    await expect(payments.settleOperation(f.id)).rejects.toMatchObject({
      code: 'STALE_PROVIDER_EVIDENCE',
    });
    expect(captureReadbackState('REFUNDED', 'COMPLETED')).toBe('REFUNDED');
    expect(orderReadbackState('CAPTURING', 'APPROVED', true)).toBe('CAPTURING');
    expect(orderReadbackState('UNKNOWN', 'APPROVED', false)).toBe('UNKNOWN');
  });
});
describe('refund identity, balance reservations and independent readback', () => {
  it('supports two partial refunds, then the remaining balance, with stable duplicate identities', async () => {
    const f = await fixture();
    const cap = captured(f);
    fakeReads(f, cap);
    await payments.settleOperation(f.id);
    const local = await readCap(f.id);
    const outcomes = new Map<string, Refund>();
    const mutate = vi
      .spyOn(paypal, 'refund')
      .mockImplementation(async (_id, _key, cents, claimId) => {
        const id = `R-${claimId}`;
        outcomes.set(id, {
          id,
          customId: claimId,
          status: 'COMPLETED' as Refund['status'],
          amount: { currencyCode: 'USD', value: (cents / 100).toFixed(2) },
          links: [
            { rel: 'up', href: `https://api.sandbox.paypal.com/v2/payments/captures/${cap.id}` },
          ],
        });
        return { id, status: 'COMPLETED' as Refund['status'] };
      });
    vi.spyOn(paypal, 'refundRead').mockImplementation(async (id) => outcomes.get(id)!);
    expect(await payments.refundPayment(a, local.id, 200, 'refund-a')).toMatchObject({
      status: 'COMPLETED',
    });
    expect(await payments.refundPayment(a, local.id, 200, 'refund-a')).toMatchObject({
      duplicate: true,
    });
    await expect(payments.refundPayment(a, local.id, 300, 'refund-a')).rejects.toMatchObject({
      status: 409,
    });
    await payments.refundPayment(a, local.id, 300, 'refund-b');
    await payments.refundPayment(a, local.id, 500, 'refund-c');
    expect(mutate).toHaveBeenCalledTimes(3);
    expect(await readCap(f.id)).toMatchObject({
      status: 'REFUNDED',
      refundedCents: 1000,
      pendingRefundCents: 0,
    });
    await expect(
      payments.refundPayment({ ...a, role: 'parent' }, local.id, 1, 'no'),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('reserves pending/unknown refunds, rejects over-refunds and recovers a lost response through custom identity', async () => {
    const f = await fixture();
    const cap = captured(f);
    fakeReads(f, cap);
    await payments.settleOperation(f.id);
    const local = await readCap(f.id);
    let providerRefund: Refund | undefined;
    const mutate = vi
      .spyOn(paypal, 'refund')
      .mockImplementation(async (_id, _key, cents, claimId) => {
        providerRefund = {
          id: 'LOST-REFUND',
          customId: claimId,
          status: 'PENDING' as Refund['status'],
          amount: { currencyCode: 'USD', value: (cents / 100).toFixed(2) },
          links: [
            { rel: 'up', href: `https://api.sandbox.paypal.com/v2/payments/captures/${cap.id}` },
          ],
        };
        throw new ProviderFailure(true, 'TIMEOUT');
      });
    await expect(payments.refundPayment(a, local.id, 600, 'lost')).rejects.toMatchObject({
      ambiguous: true,
    });
    await expect(payments.refundPayment(a, local.id, 500, 'other')).rejects.toMatchObject({
      status: 409,
    });
    f.order.purchaseUnits![0].payments!.refunds = [{ id: 'LOST-REFUND' }];
    vi.spyOn(paypal, 'refundRead').mockImplementation(async () => providerRefund!);
    await payments.settleOperation(f.id);
    expect(await readCap(f.id)).toMatchObject({ pendingRefundCents: 600, refundedCents: 0 });
    providerRefund!.status = 'COMPLETED' as Refund['status'];
    await payments.settleOperation(f.id);
    expect(await readCap(f.id)).toMatchObject({
      pendingRefundCents: 0,
      refundedCents: 600,
      status: 'PARTIALLY_REFUNDED',
    });
    expect((await data.tripData(a, f.id)).totals.net).toBe(350);
    expect(mutate).toHaveBeenCalledTimes(1);
  });
  it('does not trust a refund POST success when the GET amount differs', async () => {
    const f = await fixture();
    const cap = captured(f);
    fakeReads(f, cap);
    await payments.settleOperation(f.id);
    const local = await readCap(f.id);
    vi.spyOn(paypal, 'refund').mockResolvedValue({
      id: 'BAD-REFUND',
      status: 'COMPLETED' as Refund['status'],
    });
    vi.spyOn(paypal, 'refundRead').mockResolvedValue({
      id: 'BAD-REFUND',
      status: 'COMPLETED' as Refund['status'],
      amount: { currencyCode: 'USD', value: '9.99' },
      links: [{ rel: 'up', href: `https://api.sandbox.paypal.com/v2/payments/captures/${cap.id}` }],
    });
    await expect(payments.refundPayment(a, local.id, 1000, 'bad')).rejects.toMatchObject({
      code: 'INTEGRITY_MISMATCH',
    });
    expect((await readCap(f.id)).refundedCents).toBe(0);
  });
});
const headers = () =>
  new Headers({
    'content-type': 'application/json',
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
    'paypal-transmission-id': 'TX-1',
    'paypal-transmission-time': new Date().toISOString(),
    'paypal-transmission-sig': 'YWJjZA==',
  });
const request = (event: unknown) =>
  new Request('http://localhost/api/webhooks/paypal', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(event),
  });
describe('authenticated webhook inbox', () => {
  it('passes the complete event to verification, deduplicates and rejects identity collisions', async () => {
    const f = await fixture();
    const cap = captured(f);
    fakeReads(f, cap);
    const verify = vi.spyOn(integration, 'verifyPaypalWebhook').mockResolvedValue(true);
    const event = {
      id: randomUUID(),
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      create_time: '2026-11-04T20:00:00Z',
      summary: 'Retained complete original event',
      links: [{ href: 'https://example.test' }],
      resource: { id: cap.id, supplementary_data: { related_ids: { order_id: f.order.id } } },
    };
    await paypalWebhook(request(event));
    expect(verify).toHaveBeenCalledWith(expect.any(Headers), event);
    expect(await paypalWebhook(request(event))).toMatchObject({ duplicate: true });
    await expect(paypalWebhook(request({ ...event, summary: 'changed' }))).rejects.toMatchObject({
      status: 409,
    });
    expect(await db.select().from(s.captures).where(eq(s.captures.operationId, f.id))).toHaveLength(
      1,
    );
  });
  it('keeps failed deliveries durable, retries them and reclaims an expired worker lease', async () => {
    const f = await fixture();
    const cap = captured(f);
    fakeReads(f, cap);
    vi.spyOn(integration, 'verifyPaypalWebhook').mockResolvedValue(true);
    const event = {
      id: randomUUID(),
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: { id: cap.id, supplementary_data: { related_ids: { order_id: f.order.id } } },
    };
    const read = vi
      .spyOn(paypal, 'captureRead')
      .mockRejectedValueOnce(new ProviderFailure(true, 'READ_TIMEOUT'))
      .mockResolvedValue(cap);
    await expect(paypalWebhook(request(event))).rejects.toBeDefined();
    let [inbox] = await db.select().from(s.inbox).where(eq(s.inbox.eventId, event.id));
    expect(inbox.status).toBe('RETRYABLE');
    await db
      .update(s.inbox)
      .set({
        status: 'PROCESSING',
        leaseToken: 'crashed-worker',
        leaseUntil: new Date(Date.now() - 1000),
      })
      .where(eq(s.inbox.id, inbox.id));
    await paypalWebhook(request(event));
    [inbox] = await db.select().from(s.inbox).where(eq(s.inbox.id, inbox.id));
    expect(inbox).toMatchObject({ status: 'PROCESSED', attempts: 2 });
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('rejects unsigned, invalid-time, excessive and malformed transport before business effects', async () => {
    const h = headers();
    expect(integration.validPaypalHeaders(h)).toBe(true);
    h.set('paypal-transmission-time', 'invalid');
    expect(integration.validPaypalHeaders(h)).toBe(false);
    h.set('paypal-transmission-time', new Date(Date.now() - 4 * 86400000).toISOString());
    expect(integration.validPaypalHeaders(h)).toBe(false);
    const bad = headers();
    bad.set('paypal-cert-url', 'https://attacker.test/cert');
    expect(integration.validPaypalHeaders(bad)).toBe(false);
    await expect(
      boundedWebhookBody(
        new Request('http://local', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: 'é'.repeat(130000),
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      paypalWebhook(new Request('http://local', { method: 'POST', headers: headers(), body: '{' })),
    ).rejects.toMatchObject({ status: 400 });
    vi.spyOn(integration, 'verifyPaypalWebhook').mockResolvedValue(false);
    await expect(paypalWebhook(request({ id: 'unsigned' }))).rejects.toMatchObject({ status: 401 });
    expect(await db.select().from(s.inbox).where(eq(s.inbox.eventId, 'unsigned'))).toHaveLength(0);
  });
  it('uses fresh readback for out-of-order notifications and never regresses a refund', async () => {
    const f = await fixture();
    const cap = captured(f, true, 'REFUNDED');
    fakeReads(f, cap);
    vi.spyOn(integration, 'verifyPaypalWebhook').mockResolvedValue(true);
    for (const event_type of ['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.COMPLETED']) {
      // The event name is only a trigger. The full order/capture GET is authoritative.
      await paypalWebhook(
        request({
          id: randomUUID(),
          event_type,
          resource: { supplementary_data: { related_ids: { order_id: f.order.id } } },
        }),
      );
    }
    expect((await readOp(f.id)).status).toBe('REFUNDED');
    expect((await data.tripData(a, f.id)).totals.net).toBe(-50);
  });
});

describe('additional reconciliation boundaries', () => {
  it('releases a rejected refund reservation only through reconciled ledger state', async () => {
    const f = await fixture();
    const cap = captured(f);
    fakeReads(f, cap);
    await payments.settleOperation(f.id);
    const local = await readCap(f.id);
    const mutate = vi
      .spyOn(paypal, 'refund')
      .mockRejectedValue(new ProviderFailure(false, 'REFUND_NOT_ALLOWED'));
    await expect(payments.refundPayment(a, local.id, 200, 'rejected')).rejects.toMatchObject({
      ambiguous: false,
    });
    expect((await readCap(f.id)).pendingRefundCents).toBe(200);
    await payments.settleOperation(f.id);
    expect((await readCap(f.id)).pendingRefundCents).toBe(0);
    expect(await payments.refundPayment(a, local.id, 200, 'rejected')).toMatchObject({
      status: 'FAILED',
      duplicate: true,
    });
    expect(mutate).toHaveBeenCalledTimes(1);
  });
  it('serializes concurrent webhook claims without duplicate ledger effects', async () => {
    const f = await fixture();
    const cap = captured(f);
    fakeReads(f, cap);
    vi.spyOn(integration, 'verifyPaypalWebhook').mockResolvedValue(true);
    let release!: () => void;
    let reached!: () => void;
    const waiting = new Promise<void>((r) => (reached = r));
    const gate = new Promise<void>((r) => (release = r));
    vi.spyOn(paypal, 'captureRead').mockImplementation(async () => {
      reached();
      await gate;
      return cap;
    });
    const event = {
      id: randomUUID(),
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: { supplementary_data: { related_ids: { order_id: f.order.id } } },
    };
    const first = paypalWebhook(request(event));
    await waiting;
    await expect(paypalWebhook(request(event))).rejects.toMatchObject({ status: 503 });
    release();
    await first;
    expect(await paypalWebhook(request(event))).toMatchObject({ duplicate: true });
    expect(await db.select().from(s.captures).where(eq(s.captures.operationId, f.id))).toHaveLength(
      1,
    );
  });
  it('sends complete event values to the real verification adapter without projecting fields', async () => {
    const before = {
      env: process.env.PAYPAL_ENV,
      id: process.env.PAYPAL_CLIENT_ID,
      secret: process.env.PAYPAL_CLIENT_SECRET,
      hook: process.env.PAYPAL_WEBHOOK_ID,
    };
    Object.assign(process.env, {
      PAYPAL_ENV: 'sandbox',
      PAYPAL_CLIENT_ID: 'synthetic-only-client',
      PAYPAL_CLIENT_SECRET: 'synthetic-only-secret',
      PAYPAL_WEBHOOK_ID: 'synthetic-only-hook',
    });
    const event = {
      id: 'event-original',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: { id: 'capture-original' },
      create_time: '2026-11-04T20:00:00Z',
      resource_version: '2.0',
      links: [{ href: 'https://example.test/retained' }],
    };
    const requests: Record<string, unknown>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, options: RequestInit) => {
        if (String(_url).endsWith('/v1/oauth2/token'))
          return Response.json({ access_token: 'synthetic-only-access-token', expires_in: 0 });
        requests.push(JSON.parse(String(options.body)));
        return Response.json({ verification_status: 'SUCCESS' });
      }),
    );
    try {
      expect(await integration.verifyPaypalWebhook(headers(), event)).toBe(true);
      expect(requests[0].webhook_event).toEqual(event);
    } finally {
      vi.unstubAllGlobals();
      for (const [k, v] of Object.entries({
        PAYPAL_ENV: before.env,
        PAYPAL_CLIENT_ID: before.id,
        PAYPAL_CLIENT_SECRET: before.secret,
        PAYPAL_WEBHOOK_ID: before.hook,
      }))
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
  });
  it('keeps Studio aggregates consistent and treasury references idempotent', async () => {
    const f = await fixture();
    const input = {
      cents: 1000,
      source: 'Fictional treasury',
      evidence: 'Unique approved allocation TEST-AGGREGATE',
    };
    const first = await services.schoolContribution(a, f.id, input);
    expect(await services.schoolContribution(a, f.id, input)).toEqual(first);
    await expect(
      services.schoolContribution(a, f.id, { ...input, cents: 1001 }),
    ).rejects.toMatchObject({ status: 409 });
    expect(await db.select().from(s.audit).where(eq(s.audit.entityId, first.id))).toHaveLength(1);
    const dashboard = (await data.dashboardData(a)).find((d) => d.trip.id === f.id)!;
    const aggregate = (await data.aggregateData(a)).find((d) => d.tripId === f.id)!;
    expect(aggregate).toMatchObject({
      confirmedSeats: dashboard.coverage.coveredSeats,
      parentPaidSeats: dashboard.coverage.parentPaidSeats,
      fullyAssistedSeats: dashboard.coverage.fullyAssistedSeats,
      feePending: dashboard.totals.feePending,
      schoolContributionCents: 1000,
      netCents: dashboard.totals.net,
    });
    expect(JSON.stringify(aggregate)).not.toMatch(/authorizedBy|registrationId|parentId/);
  });
});

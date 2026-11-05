import { afterAll, beforeAll, describe, it, expect, vi } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { sql, eq } from 'drizzle-orm';
import type { Actor } from '../src/server/auth';
process.env.DATABASE_URL = '';
process.env.LOCAL_DATABASE_DIR = 'memory://';
process.env.SESSION_SECRET = 'synthetic-session-secret-with-at-least-32-characters';
const connection = await import('../src/db');
const { db } = connection;
const s = await import('../src/db/schema');
const service = await import('../src/server/services');
const data = await import('../src/server/data');
const payments = await import('../src/server/payments');
const { paypal, ProviderFailure } = await import('../src/server/integrations/paypal');
const { seed } = await import('../scripts/seed');
const admin: Actor = {
  schoolId: 'demo-school',
  userId: 'demo-admin',
  name: 'Admin',
  role: 'admin',
  mode: 'demo',
};
const finance: Actor = { ...admin, userId: 'demo-finance', role: 'finance' };
const teacher: Actor = { ...admin, userId: 'demo-teacher', role: 'teacher' };
const parent: Actor = { ...admin, userId: 'demo-parent-23', role: 'parent' };
beforeAll(async () => {
  for (const file of (await readdir('drizzle')).filter((f) => f.endsWith('.sql')).sort()) {
    for (const part of (await readFile(`drizzle/${file}`, 'utf8')).split(
      '--> statement-breakpoint',
    ))
      if (part.trim()) await db.execute(sql.raw(part));
  }
  await seed();
}, 30000);
afterAll(async () => {
  await connection.closeDatabase();
});
describe('persistent workflow and authorization', () => {
  it('keeps a $157.70 gap despite full sponsor commitments', async () => {
    const d = await data.tripData(admin, 'demo-science');
    expect(d.totals.required).toBe(69000);
    expect(d.totals.sponsorCommitted).toBe(11500);
    expect(d.totals.gross).toBe(55300);
    expect(d.totals.net).toBe(53230);
    expect(d.totals.gap).toBe(15770);
    expect(d.totals.ready).toBe(false);
  });
  it('denies teacher/admin access to assistance mappings, even on direct service calls', async () => {
    await expect(data.financeData(teacher, 'demo-science')).rejects.toMatchObject({ status: 403 });
    await expect(data.financeData(admin, 'demo-science')).rejects.toMatchObject({ status: 403 });
    const safe = JSON.stringify(await data.aggregateData(teacher));
    expect(safe).not.toContain('registration-26');
    expect(safe).not.toContain('River Hayes');
    expect(safe).not.toContain('assistance');
    const detailed = await data.financeData(finance, 'demo-science');
    expect(detailed.allocations).toHaveLength(5);
  });
  it('rejects cross-tenant trip reads and other family obligations', async () => {
    await expect(
      data.ownTrip({ ...admin, schoolId: 'sandbox-school' }, 'demo-science'),
    ).rejects.toMatchObject({ status: 404 });
    await expect(payments.paymentOrder(parent, 'demo-obligation-1')).rejects.toMatchObject({
      status: 404,
    });
  });
  it('reuses the persisted logical payment operation and captures once', async () => {
    const before = (
      await db
        .select()
        .from(s.operations)
        .where(eq(s.operations.obligationId, 'demo-obligation-23'))
    )[0];
    await payments.paymentOrder(parent, 'demo-obligation-23');
    await payments.capturePayment(parent, 'demo-obligation-23');
    await payments.capturePayment(parent, 'demo-obligation-23');
    const ops = await db
      .select()
      .from(s.operations)
      .where(eq(s.operations.obligationId, 'demo-obligation-23'));
    expect(ops).toHaveLength(1);
    expect(ops[0].id).toBe(before.id);
    expect(ops[0].requestKey).toBe(before.requestKey);
    expect(
      await db.select().from(s.captures).where(eq(s.captures.operationId, before.id)),
    ).toHaveLength(1);
  });
  it('freezes only within current consent and preserves immutable obligations', async () => {
    const id = await service.createTrip(admin, {
      name: 'Consent test activity',
      destination: 'Fictional museum',
      description: 'An approved fictional activity for tests.',
      date: '2026-12-01',
      deadline: '2026-11-30',
      capacity: 40,
      tiers: [
        { min: 1, cents: 3200 },
        { min: 2, cents: 2300 },
      ],
    });
    await service.register(parent, id, {
      student: 'Synthetic Test Student',
      consent: true,
      ceilingCents: 2300,
    });
    await expect(service.freeze(admin, id)).rejects.toThrow('Renewed parent consent');
    const [r] = await db.select().from(s.registrations).where(eq(s.registrations.tripId, id));
    await service.consent(parent, r.id, 3200);
    await service.freeze(admin, id);
    await expect(service.withdraw(parent, r.id)).rejects.toThrow('Pricing is frozen');
    const obs = await db.select().from(s.obligations).where(eq(s.obligations.tripId, id));
    expect(obs[0].cents).toBe(3200);
    await expect(service.updateTrip(admin, id, {})).rejects.toBeDefined();
  });
  it('records a full refund once and reduces net available funding', async () => {
    const before = await data.tripData(finance, 'demo-science');
    await payments.refundPayment(finance, 'demo-capture-1');
    const after = await data.tripData(finance, 'demo-science');
    expect(after.totals.net).toBe(before.totals.net - 2300);
    expect(after.totals.refunds).toBe(2300);
    expect(await payments.refundPayment(finance, 'demo-capture-1')).toMatchObject({
      duplicate: true,
      status: 'COMPLETED',
    });
  });
  it('resolves full-funding simulation with an explicit synthetic fee reserve', async () => {
    await service.fullyFundedDemo(finance, 'demo-science');
    const d = await data.tripData(finance, 'demo-science');
    expect(d.totals.gap).toBe(0);
    expect(d.totals.unresolved).toBe(0);
    expect(d.totals.schoolCents).toBe(d.totals.fees + d.totals.refunds);
    expect(d.trip.reserveCents).toBe(0);
    expect(d.coverage).toEqual({
      parentPaidSeats: 24,
      fullyAssistedSeats: 5,
      coveredSeats: 30,
      unresolvedSeats: 0,
    });
    expect(d.contributions[0]).toMatchObject({ mode: 'demo', authorizedBy: 'demo-finance' });
    expect(d.totals.ready).toBe(true);
  });
  it('persists the sandbox claim before calling create and keeps stable identity on an ambiguous response', async () => {
    const sandbox: Actor = {
      ...admin,
      mode: 'sandbox',
      schoolId: 'sandbox-school',
      userId: 'sandbox-finance',
      role: 'finance',
    };
    const [snap] = await db
      .insert(s.snapshots)
      .values({
        id: 'sandbox-test-snapshot',
        tripId: 'sandbox-science',
        seatCents: 2300,
        count: 1,
        policy: [{ min: 1, cents: 2300 }],
      })
      .returning();
    await db.insert(s.obligations).values({
      id: 'sandbox-test-obligation',
      tripId: 'sandbox-science',
      snapshotId: snap.id,
      userId: sandbox.userId,
      kind: 'SPONSOR',
      cents: 2300,
    });
    await db.update(s.trips).set({ state: 'FROZEN' }).where(eq(s.trips.id, 'sandbox-science'));
    let storedKey = '';
    const create = vi
      .spyOn(paypal, 'create')
      .mockImplementation(async (_cents, _ob, key, tripId) => {
        expect(tripId).toBe('sandbox-science');
        const [claim] = await db
          .select()
          .from(s.operations)
          .where(eq(s.operations.obligationId, 'sandbox-test-obligation'));
        expect(claim.status).toBe('CREATING');
        expect(claim.requestKey).toBe(key);
        if (storedKey) expect(key).toBe(storedKey);
        storedKey = key;
        throw new ProviderFailure(true, 'TRANSPORT');
      });
    await expect(payments.paymentOrder(sandbox, 'sandbox-test-obligation')).rejects.toMatchObject({
      ambiguous: true,
    });
    await expect(payments.paymentOrder(sandbox, 'sandbox-test-obligation')).rejects.toMatchObject({
      status: 409,
    });
    expect(create).toHaveBeenCalledTimes(1);
    const ops = await db
      .select()
      .from(s.operations)
      .where(eq(s.operations.obligationId, 'sandbox-test-obligation'));
    expect(ops).toHaveLength(1);
    expect(ops[0].status).toBe('UNKNOWN');
    create.mockRestore();
  });
});

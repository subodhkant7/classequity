import { afterAll, beforeAll, describe, it, expect, vi } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { sql, eq } from 'drizzle-orm';
import type { Actor } from '../src/server/auth';
process.env.DATABASE_URL = '';
process.env.LOCAL_DATABASE_DIR = 'memory://';
process.env.SESSION_SECRET = 'synthetic-session-secret-with-at-least-32-characters';
const connection = await import('../src/db');
const { db } = connection;
const s = await import('../src/db/schema');
const auth = await import('../src/server/auth');
const service = await import('../src/server/services');
const data = await import('../src/server/data');
const payments = await import('../src/server/payments');
const messaging = await import('../src/server/messaging');
const gemini = await import('../src/server/integrations/gemini');
const demoSim = await import('../src/lib/demo-simulation');
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

const sandboxAdmin: Actor = {
  schoolId: 'sandbox-school',
  userId: 'sandbox-admin',
  name: 'Sandbox Admin',
  role: 'admin',
  mode: 'sandbox',
};
const sandboxFinance: Actor = { ...sandboxAdmin, userId: 'sandbox-finance', role: 'finance' };
const sandboxParent: Actor = {
  schoolId: 'sandbox-school',
  userId: 'sandbox-parent-test',
  name: 'Sandbox Family',
  role: 'parent',
  mode: 'sandbox',
};

beforeAll(async () => {
  for (const file of (await readdir('drizzle')).filter((f) => f.endsWith('.sql')).sort()) {
    for (const part of (await readFile(`drizzle/${file}`, 'utf8')).split(
      '--> statement-breakpoint',
    ))
      if (part.trim()) await db.execute(sql.raw(part));
  }
  await seed();
  await db
    .insert(s.users)
    .values({
      id: sandboxParent.userId,
      name: sandboxParent.name,
      email: 'sandbox-parent-test@example.test',
    })
    .onConflictDoNothing();
  await db
    .insert(s.memberships)
    .values({
      id: sandboxParent.userId,
      schoolId: 'sandbox-school',
      userId: sandboxParent.userId,
      role: 'parent',
    })
    .onConflictDoNothing();
}, 30000);

afterAll(async () => {
  await connection.closeDatabase();
});

describe('public demo isolation, read-only guards and canonical protection', () => {
  it('keeps canonical $157.70 gap and exact seeded metrics in demo mode', async () => {
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
    await expect(data.ownTrip(admin, 'sandbox-science')).rejects.toMatchObject({ status: 404 });
    await expect(payments.paymentOrder(parent, 'demo-obligation-1')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('rejects every persistent demo service and payment mutation with 403 DEMO_READ_ONLY', async () => {
    const validTripInput = {
      name: 'Blocked demo mutation',
      destination: 'Demo destination',
      description: 'Blocked public demo trip creation attempt.',
      date: '2026-12-01',
      deadline: '2026-11-30',
      capacity: 30,
      tiers: [{ min: 1, cents: 2300 }],
    };

    const checks = [
      service.createTrip(admin, validTripInput),
      service.updateSchool(admin, 'Mutated Academy'),
      service.updateTrip(admin, 'demo-science', validTripInput),
      service.register(parent, 'demo-science', {
        student: 'Demo Mutation Student',
        consent: true,
        ceilingCents: 3200,
      }),
      service.withdraw(parent, 'demo-registration-23'),
      service.consent(parent, 'demo-registration-23', 3200),
      service.requestAssistance(parent, 'demo-registration-23'),
      service.approveAssistance(finance, 'assistance-demo-registration-30', 2300),
      service.freeze(admin, 'demo-science'),
      service.sponsor(parent, 'demo-science', 1000),
      service.invite(admin, 'demo-science'),
      service.fullyFundedDemo(finance, 'demo-science'),
      service.createSchool(admin, 'Mutated Demo School'),
      service.schoolContribution(finance, 'demo-science', {
        cents: 1000,
        source: 'Blocked demo contribution',
        evidence: 'DEMO-MUTATION-REF-001',
      }),
      payments.paymentOrder(parent, 'demo-obligation-23'),
      payments.capturePayment(parent, 'demo-obligation-23'),
      payments.reconcile(parent, 'demo-payment-23'),
      payments.refundPayment(finance, 'demo-capture-1'),
      messaging.secureLink(admin, 'demo-science'),
      messaging.simulateMessage(admin, 'demo-science', 'Hello', 'en'),
      messaging.connectPhone(parent, 'demo-science', '+15551234567'),
      messaging.remind(admin, 'demo-conversation'),
    ];

    for (const p of checks) {
      await expect(p).rejects.toMatchObject({ status: 403, code: 'DEMO_READ_ONLY' });
    }

    // Verify canonical demo state remains untouched after all rejected attempts.
    const trips = await data.dashboardData(admin);
    expect(trips).toHaveLength(1);
    expect(trips[0].totals).toMatchObject({
      required: 69000,
      gross: 55300,
      net: 53230,
      gap: 15770,
      schoolCents: 0,
      unresolved: 3,
      ready: false,
    });
  });

  it('filters historical demo drift rows on read without modifying database records', async () => {
    const driftedTripId = 'drifted-demo-trip-test';
    const driftedRegId = 'drifted-demo-reg-test';
    const driftedContribId = 'drifted-demo-contrib-test';
    const driftedDashId = 'drifted-demo-dash-test';

    await db.insert(s.trips).values({
      id: driftedTripId,
      schoolId: 'demo-school',
      name: 'Historical Drift Trip',
      destination: 'Old Drift Destination',
      description: 'Drifted public demo record that should be filtered out on read.',
      date: '2026-12-05',
      deadline: '2026-12-01',
      capacity: 25,
      tiers: [{ min: 1, cents: 2000 }],
      state: 'OPEN',
    });
    await db.insert(s.registrations).values({
      id: driftedRegId,
      tripId: 'demo-science',
      parentId: 'demo-parent-23',
      student: 'Drifted Student',
    });
    await db.insert(s.contributions).values({
      id: driftedContribId,
      tripId: 'demo-science',
      mode: 'demo',
      cents: 1000,
      source: 'Drifted demo treasury',
      evidence: 'HISTORICAL-DRIFT-001',
      authorizedBy: 'demo-finance',
    });
    await db.insert(s.dashboards).values({
      id: driftedDashId,
      schoolId: 'demo-school',
      userId: 'demo-admin',
      state: { selectedPageId: 'Drifted Page', pages: [] },
    });

    const dash = await data.dashboardData(admin);
    expect(dash).toHaveLength(1);
    expect(dash[0].trip.id).toBe('demo-science');
    expect(dash[0].registrationCount).toBe(30);
    expect(dash[0].totals.schoolCents).toBe(0);
    expect(dash[0].totals.net).toBe(53230);
    expect(dash[0].totals.gap).toBe(15770);

    await expect(data.ownTrip(admin, driftedTripId)).rejects.toMatchObject({ status: 404 });

    const fin = await data.financeData(finance, 'demo-science');
    expect(fin.contributions).toHaveLength(0);

    const pData = await data.parentData(parent, 'demo-science');
    expect(pData.registrations.map((r) => r.id)).toEqual(['demo-registration-23']);

    // Drifted rows were preserved (non-destructive filtering), clean up test-inserted drift rows afterwards
    expect(await db.select().from(s.trips).where(eq(s.trips.id, driftedTripId))).toHaveLength(1);
    await db.delete(s.dashboards).where(eq(s.dashboards.id, driftedDashId));
    await db.delete(s.contributions).where(eq(s.contributions.id, driftedContribId));
    await db.delete(s.registrations).where(eq(s.registrations.id, driftedRegId));
    await db.delete(s.trips).where(eq(s.trips.id, driftedTripId));
  });

  it('keeps local grounded demo assistant read-only without calling Gemini or logging assessments', async () => {
    const before = await db
      .select()
      .from(s.assessments)
      .where(eq(s.assessments.schoolId, 'demo-school'));
    const reply = await gemini.assistant(
      admin,
      'demo-science',
      'What is the group price?',
      'en',
      true,
    );
    expect(reply.source).toBe('Grounded local assistant');
    expect(reply.model).toBeNull();
    expect(reply.text).toContain('$23.00');
    const after = await db
      .select()
      .from(s.assessments)
      .where(eq(s.assessments.schoolId, 'demo-school'));
    expect(after).toHaveLength(before.length);
  });

  it('isolates API quotas per authenticated demo session', async () => {
    const visitorA = auth.bindSessionQuotaKey({ ...admin }, 'session-a-unique');
    const visitorB = auth.bindSessionQuotaKey({ ...admin }, 'session-b-unique');
    for (let i = 0; i < 240; i++) {
      await auth.enforceApiQuota(visitorA);
    }
    await expect(auth.enforceApiQuota(visitorA)).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMIT',
    });
    // Visitor B has its own independent session bucket and still succeeds.
    await expect(auth.enforceApiQuota(visitorB)).resolves.toBeUndefined();
  });
});

describe('browser-local demo simulation engine (pure in-memory math)', () => {
  it('computes pricing tier preview, full funding simulation, contributions, and idempotent refunds without DB writes', async () => {
    const baseTrip = (await data.dashboardData(finance))[0];
    const baseFinance = await data.financeData(finance, 'demo-science');

    const at19 = demoSim.applyDemoPricingPreview(baseTrip, 19);
    const at20 = demoSim.applyDemoPricingPreview(baseTrip, 20);
    const at30 = demoSim.applyDemoPricingPreview(baseTrip, 30);
    expect(at19.seatCents).toBe(3200);
    expect(at20.seatCents).toBe(2700);
    expect(at30.seatCents).toBe(2300);

    const funded = demoSim.applyDemoFundedSimulation(baseTrip, baseFinance);
    expect(funded.trip.totals.gap).toBe(0);
    expect(funded.trip.totals.unresolved).toBe(0);
    expect(funded.trip.totals.ready).toBe(true);
    expect(funded.trip.coverage).toEqual({
      parentPaidSeats: 25,
      fullyAssistedSeats: 5,
      coveredSeats: 30,
      unresolvedSeats: 0,
    });

    const contrib = demoSim.applyDemoContributionSimulation(baseTrip, baseFinance, {
      cents: 1000,
      source: 'Parent Association Gift',
      evidence: 'LOCAL-PREVIEW-GIFT-01',
    });
    expect(contrib.trip.totals.schoolCents).toBe(1000);
    expect(contrib.trip.totals.net).toBe(baseTrip.totals.net + 1000);

    const refunded = demoSim.applyDemoRefundSimulation(
      baseTrip,
      baseFinance,
      'demo-capture-1',
      2300,
      'test-refund-key',
    );
    expect(refunded.duplicate).toBe(false);
    expect(refunded.trip.totals.refunds).toBe(2300);
    expect(refunded.trip.totals.net).toBe(baseTrip.totals.net - 2300);

    const dup = demoSim.applyDemoRefundSimulation(
      refunded.trip,
      refunded.finance,
      'demo-capture-1',
      2300,
      'test-refund-key',
      refunded.seenKeys,
    );
    expect(dup.duplicate).toBe(true);
    expect(() =>
      demoSim.applyDemoRefundSimulation(
        refunded.trip,
        refunded.finance,
        'demo-capture-1',
        1000,
        'test-refund-key',
        refunded.seenKeys,
      ),
    ).toThrow('Refund identity reused with another amount.');

    // Database must remain completely unchanged.
    const dbCheck = (await data.dashboardData(finance))[0];
    expect(dbCheck.totals.gap).toBe(15770);
  });
});

describe('persistent sandbox workflow, authorization, and PayPal readback', () => {
  it('freezes sandbox trips only within current consent and preserves immutable obligations', async () => {
    const id = await service.createTrip(sandboxAdmin, {
      name: 'Consent test activity',
      destination: 'Exploratorium annex',
      description: 'An approved sandbox activity for consent and freeze tests.',
      date: '2026-12-01',
      deadline: '2026-11-30',
      capacity: 40,
      tiers: [
        { min: 1, cents: 3200 },
        { min: 2, cents: 2300 },
      ],
    });
    await service.register(sandboxParent, id, {
      student: 'Sample Sandbox Student',
      consent: true,
      ceilingCents: 2300,
    });
    await expect(service.freeze(sandboxAdmin, id)).rejects.toThrow('Renewed parent consent');
    const [r] = await db.select().from(s.registrations).where(eq(s.registrations.tripId, id));
    await service.consent(sandboxParent, r.id, 3200);
    await service.freeze(sandboxAdmin, id);
    await expect(service.withdraw(sandboxParent, r.id)).rejects.toThrow('Pricing is frozen');
    const obs = await db.select().from(s.obligations).where(eq(s.obligations.tripId, id));
    expect(obs[0].cents).toBe(3200);
    await expect(service.updateTrip(sandboxAdmin, id, {})).rejects.toBeDefined();
  });

  it('persists the sandbox claim before calling create and keeps stable identity on an ambiguous response', async () => {
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
      userId: sandboxFinance.userId,
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
    await expect(
      payments.paymentOrder(sandboxFinance, 'sandbox-test-obligation'),
    ).rejects.toMatchObject({
      ambiguous: true,
    });
    await expect(
      payments.paymentOrder(sandboxFinance, 'sandbox-test-obligation'),
    ).rejects.toMatchObject({
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

  it('supports idempotent sandbox treasury contributions across independent trips', async () => {
    const id = await service.createTrip(sandboxAdmin, {
      name: `Treasury test ${randomUUID().slice(0, 6)}`,
      destination: 'Planetarium',
      description: 'Sandbox treasury verification trip.',
      date: '2026-12-01',
      deadline: '2026-11-30',
      capacity: 10,
      tiers: [{ min: 1, cents: 1500 }],
    });
    const res = await service.schoolContribution(sandboxFinance, id, {
      cents: 1500,
      source: 'Verified Sandbox Treasury',
      evidence: `REF-${id}`,
    });
    expect(res.id).toMatch(/^treasury-/);
    expect((await data.tripData(sandboxFinance, id)).totals.schoolCents).toBe(1500);
  });
});

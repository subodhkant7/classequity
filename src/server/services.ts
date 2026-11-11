import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import * as s from '@/db/schema';
import { seatPrice, tripInput } from '@/lib/domain';
import { type Actor, hash, roles } from './auth';
import { AppError, requireValue } from './errors';
import { ownTrip } from './data';
import { assertMutableWorkspace } from './demo-policy';
export const uid = () => randomUUID();
export async function record(
  a: Actor,
  action: string,
  entityId: string,
  detail: Record<string, unknown> = {},
) {
  assertMutableWorkspace(a);
  await db
    .insert(s.audit)
    .values({ id: uid(), schoolId: a.schoolId, userId: a.userId, action, entityId, detail });
}
export async function createTrip(a: Actor, input: unknown) {
  assertMutableWorkspace(a);
  roles(a, ['admin', 'finance']);
  const v = tripInput.parse(input);
  const id = uid();
  await db.insert(s.trips).values({ ...v, id, schoolId: a.schoolId });
  await record(a, 'TRIP_CREATED', id);
  return id;
}
export async function updateSchool(a: Actor, name: string) {
  assertMutableWorkspace(a);
  roles(a, ['admin']);
  const valid = z.string().trim().min(3).max(100).parse(name);
  await db.update(s.schools).set({ name: valid }).where(eq(s.schools.id, a.schoolId));
  await record(a, 'SCHOOL_UPDATED', a.schoolId);
}
export async function updateTrip(a: Actor, id: string, input: unknown) {
  await ownTrip(a, id);
  assertMutableWorkspace(a);
  roles(a, ['admin', 'finance']);
  const v = tripInput.parse(input);
  await db.transaction(async (tx) => {
    const [trip] = await tx
      .select()
      .from(s.trips)
      .where(and(eq(s.trips.id, id), eq(s.trips.schoolId, a.schoolId)))
      .for('update');
    if (!trip) throw new AppError('Trip not found', 404);
    if (trip.state !== 'OPEN')
      throw new AppError('Frozen pricing is immutable. Create a new activity for revised prices.');
    const regs = await tx
      .select()
      .from(s.registrations)
      .where(and(eq(s.registrations.tripId, id), eq(s.registrations.status, 'REGISTERED')));
    if (v.capacity < regs.length)
      throw new AppError('Capacity cannot be less than current registrations.');
    await tx.update(s.trips).set(v).where(eq(s.trips.id, id));
  });
  await record(a, 'TRIP_UPDATED', id);
}
export async function register(a: Actor, id: string, input: unknown) {
  await ownTrip(a, id);
  assertMutableWorkspace(a);
  roles(a, ['parent']);
  const v = z
    .object({
      student: z.string().trim().min(3).max(80),
      consent: z.literal(true),
      ceilingCents: z.number().int().positive().max(10000000),
    })
    .parse(input);
  await db.transaction(async (tx) => {
    const [t] = await tx
      .select()
      .from(s.trips)
      .where(and(eq(s.trips.id, id), eq(s.trips.schoolId, a.schoolId)))
      .for('update');
    if (!t) throw new AppError('Trip not found', 404);
    if (t.state !== 'OPEN')
      throw new AppError('Registration has closed and final pricing is frozen.');
    if (new Date(`${t.deadline}T23:59:59Z`) < new Date())
      throw new AppError('Registration deadline has passed.');
    const count = await tx
      .select()
      .from(s.registrations)
      .where(and(eq(s.registrations.tripId, id), eq(s.registrations.status, 'REGISTERED')));
    if (count.length >= t.capacity) throw new AppError('This activity has reached capacity.');
    const idReg = uid();
    await tx
      .insert(s.registrations)
      .values({ id: idReg, tripId: id, parentId: a.userId, student: v.student });
    await tx
      .insert(s.consents)
      .values({ id: uid(), registrationId: idReg, ceilingCents: v.ceilingCents, accepted: true });
  });
  await record(a, 'REGISTRATION_CONSENT_RECORDED', id);
}
export async function withdraw(a: Actor, registrationId: string) {
  const [r] = await db
    .select()
    .from(s.registrations)
    .where(eq(s.registrations.id, registrationId));
  if (!r) throw new AppError('Registration not found', 404);
  await ownTrip(a, r.tripId);
  if (a.role === 'parent' && r.parentId !== a.userId)
    throw new AppError('Registration not found', 404);
  assertMutableWorkspace(a);
  roles(a, ['parent']);
  await db.transaction(async (tx) => {
    const [t] = await tx.select().from(s.trips).where(eq(s.trips.id, r.tripId)).for('update');
    if (t.state !== 'OPEN')
      throw new AppError('Pricing is frozen. Contact finance for cancellation and refund review.');
    await tx
      .update(s.registrations)
      .set({ status: 'WITHDRAWN' })
      .where(eq(s.registrations.id, registrationId));
  });
  await record(a, 'REGISTRATION_WITHDRAWN', registrationId);
}
export async function consent(a: Actor, registrationId: string, ceilingCents: number) {
  z.number().int().positive().max(10000000).parse(ceilingCents);
  const [r] = await db
    .select()
    .from(s.registrations)
    .where(eq(s.registrations.id, registrationId));
  requireValue(r);
  const t = await ownTrip(a, r.tripId);
  if (a.role === 'parent' && r.parentId !== a.userId) throw new AppError('Not found', 404);
  assertMutableWorkspace(a);
  roles(a, ['parent']);
  if (t.state !== 'OPEN') throw new AppError('Final consent already recorded');
  await db.insert(s.consents).values({ id: uid(), registrationId, ceilingCents, accepted: true });
  await record(a, 'CONSENT_RENEWED', registrationId);
}
export async function requestAssistance(a: Actor, registrationId: string) {
  const [r] = await db
    .select()
    .from(s.registrations)
    .where(eq(s.registrations.id, registrationId));
  requireValue(r);
  const t = await ownTrip(a, r.tripId);
  if (a.role === 'parent' && r.parentId !== a.userId) throw new AppError('Not found', 404);
  assertMutableWorkspace(a);
  roles(a, ['parent']);
  if (t.state !== 'OPEN')
    throw new AppError('Contact finance: pricing has already been finalized.');
  await db
    .insert(s.assistance)
    .values({ id: uid(), tripId: r.tripId, registrationId, cents: 0, status: 'REQUESTED' })
    .onConflictDoNothing();
  await record(a, 'PRIVATE_SUPPORT_REQUESTED', r.id);
}
export async function approveAssistance(a: Actor, allocationId: string, cents: number) {
  z.number().int().nonnegative().max(10000000).parse(cents);
  const [allocation] = await db
    .select()
    .from(s.assistance)
    .where(eq(s.assistance.id, allocationId));
  requireValue(allocation);
  await ownTrip(a, allocation.tripId);
  assertMutableWorkspace(a);
  roles(a, ['finance']);
  await db.transaction(async (tx) => {
    const [t] = await tx
      .select()
      .from(s.trips)
      .where(eq(s.trips.id, allocation.tripId))
      .for('update');
    if (t.state !== 'OPEN') throw new AppError('Assistance must be approved before price freeze.');
    const regs = await tx
      .select()
      .from(s.registrations)
      .where(and(eq(s.registrations.tripId, t.id), eq(s.registrations.status, 'REGISTERED')));
    if (cents > seatPrice(t.tiers, regs.length))
      throw new AppError('Allocation cannot exceed the estimated seat price.');
    await tx
      .update(s.assistance)
      .set({ cents, status: 'APPROVED', approvedBy: a.userId })
      .where(eq(s.assistance.id, allocationId));
  });
  await record(a, 'ASSISTANCE_APPROVED', allocationId, { cents });
}
export async function freeze(a: Actor, id: string) {
  await ownTrip(a, id);
  assertMutableWorkspace(a);
  roles(a, ['admin', 'finance']);
  await db.transaction(async (tx) => {
    const [t] = await tx.select().from(s.trips).where(eq(s.trips.id, id)).for('update');
    if (t.state !== 'OPEN') throw new AppError('The final price is already frozen.');
    const regs = await tx
      .select()
      .from(s.registrations)
      .where(and(eq(s.registrations.tripId, id), eq(s.registrations.status, 'REGISTERED')));
    if (!regs.length) throw new AppError('At least one registration is required.');
    const cents = seatPrice(t.tiers, regs.length);
    const approved = await tx
      .select()
      .from(s.assistance)
      .where(and(eq(s.assistance.tripId, id), eq(s.assistance.status, 'APPROVED')));
    const allConsents = await tx
      .select()
      .from(s.consents)
      .where(
        inArray(
          s.consents.registrationId,
          regs.map((r) => r.id),
        ),
      );
    for (const r of regs) {
      const current = allConsents
        .filter((c) => c.registrationId === r.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      if (!current?.accepted || current.ceilingCents < cents)
        throw new AppError('Renewed parent consent is required before freezing this price.');
    }
    const snapshotId = uid();
    await tx.insert(s.snapshots).values({
      id: snapshotId,
      tripId: id,
      seatCents: cents,
      count: regs.length,
      policy: t.tiers,
    });
    for (const r of regs) {
      const support = approved.find((x) => x.registrationId === r.id)?.cents ?? 0;
      await tx.insert(s.obligations).values({
        id: uid(),
        tripId: id,
        snapshotId,
        userId: r.parentId,
        registrationId: r.id,
        kind: 'SEAT',
        cents: Math.max(0, cents - support),
      });
    }
    const commitments = await tx.select().from(s.commitments).where(eq(s.commitments.tripId, id));
    for (const c of commitments)
      await tx.insert(s.obligations).values({
        id: uid(),
        tripId: id,
        snapshotId,
        userId: c.userId,
        commitmentId: c.id,
        kind: 'SPONSOR',
        cents: c.cents,
      });
    await tx.update(s.trips).set({ state: 'FROZEN' }).where(eq(s.trips.id, id));
  });
  await record(a, 'PRICE_FROZEN', id);
}
export async function sponsor(a: Actor, id: string, cents: number) {
  z.number().int().min(100).max(100000).parse(cents);
  await ownTrip(a, id);
  assertMutableWorkspace(a);
  roles(a, ['parent']);
  return db.transaction(async (tx) => {
    await tx.select().from(s.trips).where(eq(s.trips.id, id)).for('update');
    const commitmentId = uid();
    await tx
      .insert(s.commitments)
      .values({ id: commitmentId, tripId: id, userId: a.userId, cents });
    const [snap] = await tx.select().from(s.snapshots).where(eq(s.snapshots.tripId, id));
    let obligationId: string | null = null;
    if (snap) {
      obligationId = uid();
      await tx.insert(s.obligations).values({
        id: obligationId,
        tripId: id,
        snapshotId: snap.id,
        userId: a.userId,
        commitmentId,
        kind: 'SPONSOR',
        cents,
      });
    }
    return { commitmentId, obligationId };
  });
}
export async function invite(a: Actor, id: string) {
  await ownTrip(a, id);
  assertMutableWorkspace(a);
  roles(a, ['admin', 'finance']);
  const userId = uid();
  await db.insert(s.users).values({
    id: userId,
    name: `Invited family ${userId.slice(0, 4)}`,
    email: `${userId}@example.test`,
  });
  await db
    .insert(s.memberships)
    .values({ id: uid(), schoolId: a.schoolId, userId, role: 'parent' });
  const token = randomBytes(32).toString('hex');
  await db.insert(s.invitations).values({
    id: uid(),
    tokenHash: hash(token),
    tripId: id,
    userId,
    expiresAt: new Date(Date.now() + 30 * 60000),
  });
  await record(a, 'INVITATION_ISSUED', id);
  return `${process.env.APP_URL || 'http://localhost:3000'}/invite/${token}`;
}
export async function fullyFundedDemo(a: Actor, id: string) {
  await ownTrip(a, id);
  assertMutableWorkspace(a);
  roles(a, ['finance']);
  throw new AppError('Simulation is only available in browser-local demo mode', 403);
}
export async function createSchool(a: Actor, name: string) {
  assertMutableWorkspace(a);
  roles(a, ['admin']);
  const valid = z.string().trim().min(3).max(100).parse(name);
  const id = uid();
  await db.transaction(async (tx) => {
    await tx.insert(s.schools).values({ id, name: valid, mode: a.mode });
    await tx
      .insert(s.memberships)
      .values({ id: uid(), schoolId: id, userId: a.userId, role: 'admin' });
  });
  await record({ ...a, schoolId: id }, 'SCHOOL_CREATED', id);
  return id;
}

export async function schoolContribution(a: Actor, tripId: string, input: unknown) {
  await ownTrip(a, tripId);
  assertMutableWorkspace(a);
  roles(a, ['finance']);
  const v = z
    .object({
      cents: z.number().int().positive().max(10000000),
      source: z.string().trim().min(3).max(160),
      evidence: z.string().trim().min(8).max(500),
    })
    .parse(input);
  const id =
    'treasury-' +
    createHash('sha256')
      .update(JSON.stringify([tripId, a.mode, v.source, v.evidence]))
      .digest('hex');
  await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(s.contributions)
      .values({ ...v, id, tripId, mode: a.mode, authorizedBy: a.userId })
      .onConflictDoNothing({ target: s.contributions.id })
      .returning();
    if (!inserted) {
      const [prior] = await tx.select().from(s.contributions).where(eq(s.contributions.id, id));
      if (prior.cents !== v.cents)
        throw new AppError('Treasury reference already recorded with another amount.', 409);
      return;
    }
    await tx.insert(s.audit).values({
      id: uid(),
      schoolId: a.schoolId,
      userId: a.userId,
      action: a.mode === 'demo' ? 'SYNTHETIC_SCHOOL_CONTRIBUTION' : 'SCHOOL_CONTRIBUTION_ATTESTED',
      entityId: id,
      detail: { tripId, cents: v.cents, source: v.source, evidence: v.evidence, mode: a.mode },
    });
  });
  return { id };
}

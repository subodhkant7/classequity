import { and, eq, inArray, asc } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import type { Actor } from './auth';
import { roles } from './auth';
import { AppError, requireValue } from './errors';
import { funding, seatPrice, seatCoverage, availableCapture } from '@/lib/domain';
import {
  assertMutableWorkspace,
  CANONICAL_DEMO_SNAPSHOT_ID,
  CANONICAL_DEMO_TIERS,
  CANONICAL_DEMO_TRIP_ID,
  canonicalDemoOperationStatus,
  isCanonicalDemoAllocationId,
  isCanonicalDemoCaptureId,
  isCanonicalDemoCommitmentId,
  isCanonicalDemoConsentId,
  isCanonicalDemoObligationId,
  isCanonicalDemoRegistrationId,
  normalizeCanonicalDemoTrip,
} from './demo-policy';
export async function ownTrip(a: Actor, id: string) {
  if (a.mode === 'demo' && id !== CANONICAL_DEMO_TRIP_ID)
    throw new AppError('Not found', 404, 'NOT_FOUND');
  const [trip] = await db
    .select()
    .from(s.trips)
    .where(and(eq(s.trips.id, id), eq(s.trips.schoolId, a.schoolId)));
  const found = requireValue(trip);
  return a.mode === 'demo' ? normalizeCanonicalDemoTrip(found) : found;
}
export async function tripData(a: Actor, id: string) {
  const trip = await ownTrip(a, id);
  const rawRegs = await db
    .select()
    .from(s.registrations)
    .where(
      a.mode === 'demo'
        ? eq(s.registrations.tripId, id)
        : and(eq(s.registrations.tripId, id), eq(s.registrations.status, 'REGISTERED')),
    )
    .orderBy(asc(s.registrations.createdAt), asc(s.registrations.id));
  const regs =
    a.mode === 'demo'
      ? rawRegs
          .filter((r) => isCanonicalDemoRegistrationId(r.id))
          .map((r) => ({ ...r, status: 'REGISTERED' }))
      : rawRegs;
  const rawSnapshots = await db.select().from(s.snapshots).where(eq(s.snapshots.tripId, id));
  const snapshot =
    a.mode === 'demo'
      ? rawSnapshots
          .filter((sn) => sn.id === CANONICAL_DEMO_SNAPSHOT_ID)
          .map((sn) => ({
            ...sn,
            seatCents: 2300,
            count: 30,
            policy: CANONICAL_DEMO_TIERS.map((t) => ({ ...t })),
          }))
          .at(0)
      : rawSnapshots.at(0);
  const rawAllocations = await db
    .select()
    .from(s.assistance)
    .where(
      a.mode === 'demo'
        ? eq(s.assistance.tripId, id)
        : and(eq(s.assistance.tripId, id), eq(s.assistance.status, 'APPROVED')),
    );
  const allocations =
    a.mode === 'demo'
      ? rawAllocations
          .filter((x) => isCanonicalDemoAllocationId(x.id))
          .map((x) => ({ ...x, status: 'APPROVED', cents: 2300 }))
      : rawAllocations;
  const rawSponsors = await db.select().from(s.commitments).where(eq(s.commitments.tripId, id));
  const sponsors =
    a.mode === 'demo'
      ? rawSponsors.filter((x) => isCanonicalDemoCommitmentId(x.id))
      : rawSponsors;
  const rawObs = await db.select().from(s.obligations).where(eq(s.obligations.tripId, id));
  const obs =
    a.mode === 'demo' ? rawObs.filter((o) => isCanonicalDemoObligationId(o.id)) : rawObs;
  const allOps = obs.length
    ? await db
        .select()
        .from(s.operations)
        .where(
          inArray(
            s.operations.obligationId,
            obs.map((o) => o.id),
          ),
        )
    : [];
  const ops =
    a.mode === 'demo'
      ? allOps
          .filter(
            (o) =>
              o.mode === 'demo' &&
              o.schoolId === a.schoolId &&
              canonicalDemoOperationStatus(o.id) !== null,
          )
          .map((o) => ({ ...o, status: canonicalDemoOperationStatus(o.id)!, errorCode: null }))
      : allOps.filter((o) => o.mode === a.mode && o.schoolId === a.schoolId);
  const allCaps = ops.length
    ? await db
        .select()
        .from(s.captures)
        .where(
          inArray(
            s.captures.operationId,
            ops.map((o) => o.id),
          ),
        )
    : [];
  const caps =
    a.mode === 'demo'
      ? allCaps
          .filter((c) => c.provenance === 'SYNTHETIC' && isCanonicalDemoCaptureId(c.id))
          .map((c) => ({
            ...c,
            status: 'COMPLETED',
            refundedCents: 0,
            pendingRefundCents: 0,
            feeKnown: true,
          }))
      : allCaps.filter((c) => c.provenance === 'PAYPAL_SANDBOX' && !!c.verifiedAt);
  const contributions =
    a.mode === 'demo'
      ? []
      : await db
          .select()
          .from(s.contributions)
          .where(and(eq(s.contributions.tripId, id), eq(s.contributions.mode, a.mode)));
  const seatCents = snapshot?.seatCents ?? seatPrice(trip.tiers, regs.length);
  const unresolved = ops.filter((o) =>
    ['UNKNOWN', 'PENDING', 'CAPTURING', 'CREATING', 'REFUND_PENDING'].includes(o.status),
  ).length;
  const totals = funding({
    seatCents,
    registrations: snapshot?.count ?? regs.length,
    assistedCents: allocations.reduce((v, x) => v + x.cents, 0),
    sponsorCommittedCents: sponsors.reduce((v, x) => v + x.cents, 0),
    captures: caps,
    unresolved,
    schoolCents: contributions.reduce((n, c) => n + c.cents, 0),
  });
  const seats = regs.map((r) => {
    const ob = obs.find((o) => o.registrationId === r.id);
    const op = ops.find((o) => o.obligationId === ob?.id);
    const cap = caps.find((c) => c.operationId === op?.id);
    return {
      parentDue: ob?.cents ?? seatCents,
      paid:
        cap && ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(cap.status)
          ? Math.max(0, cap.cents - cap.refundedCents)
          : 0,
      available: cap ? availableCapture(cap) : 0,
    };
  });
  const coverage = seatCoverage(seatCents, totals.net, seats);
  // Without a frozen snapshot, seats and prices remain estimates.
  totals.ready =
    totals.ready && !!snapshot && snapshot.count === regs.length && coverage.unresolvedSeats === 0;
  const outstandingObligationCents = obs.reduce((n, ob) => {
    const op = ops.find((o) => o.obligationId === ob.id);
    const cap = caps.find((c) => c.operationId === op?.id);
    const paid =
      cap && ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(cap.status)
        ? Math.max(0, cap.cents - cap.refundedCents)
        : 0;
    return n + Math.max(0, ob.cents - paid);
  }, 0);
  const confirmedSeats = coverage.coveredSeats;
  return {
    trip,
    registrations: regs,
    snapshot: snapshot ?? null,
    seatCents,
    totals,
    confirmedSeats,
    coverage,
    outstandingObligationCents,
    contributions,
    ops,
    caps,
    obs,
  };
}
export async function dashboardData(a: Actor) {
  roles(a, ['admin', 'finance', 'teacher']);
  const allTrips = await db.select().from(s.trips).where(eq(s.trips.schoolId, a.schoolId));
  const trips =
    a.mode === 'demo' ? allTrips.filter((t) => t.id === CANONICAL_DEMO_TRIP_ID) : allTrips;
  return Promise.all(
    trips.map(async (t) => {
      const d = await tripData(a, t.id);
      return {
        trip: d.trip,
        mode: a.mode,
        snapshot: d.snapshot,
        seatCents: d.seatCents,
        totals: d.totals,
        registrationCount: d.registrations.length,
        confirmedSeats: d.confirmedSeats,
        coverage: d.coverage,
        outstandingObligationCents: d.outstandingObligationCents,
        payments: d.ops.map((o) => ({
          id: o.id,
          status: o.status,
          mode: o.mode,
          createdAt: o.createdAt.toISOString(),
        })),
      };
    }),
  );
}
export async function safeRegistrations(a: Actor, id: string) {
  roles(a, ['admin', 'finance', 'teacher']);
  const d = await tripData(a, id);
  return d.registrations.map((r) => ({
    id: r.id,
    student: r.student,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}
export async function financeData(a: Actor, id: string) {
  roles(a, ['finance']);
  const d = await tripData(a, id);
  const rawAllocations = await db
    .select({
      id: s.assistance.id,
      registrationId: s.assistance.registrationId,
      student: s.registrations.student,
      status: s.assistance.status,
      cents: s.assistance.cents,
    })
    .from(s.assistance)
    .innerJoin(s.registrations, eq(s.assistance.registrationId, s.registrations.id))
    .where(eq(s.assistance.tripId, id));
  const allocations =
    a.mode === 'demo'
      ? rawAllocations
          .filter((x) => isCanonicalDemoAllocationId(x.id))
          .map((x) => ({ ...x, status: 'APPROVED', cents: 2300 }))
      : rawAllocations;
  return {
    allocations,
    contributions: d.contributions,
    operations: d.ops.map((o) => ({
      ...o,
      cents: d.obs.find((x) => x.id === o.obligationId)?.cents ?? 0,
      capture: d.caps.find((c) => c.operationId === o.id) ?? null,
    })),
    obligations: d.obs,
  };
}
export async function parentData(a: Actor, id: string) {
  roles(a, ['parent']);
  const d = await tripData(a, id);
  const mine = d.registrations.filter((r) => r.parentId === a.userId);
  const obligations = d.obs.filter((o) => o.userId === a.userId);
  const ownOps = d.ops.filter((o) => obligations.some((b) => b.id === o.obligationId));
  const receipts = d.caps.filter((c) => ownOps.some((o) => o.id === c.operationId));
  const rawConsents = mine.length
    ? await db
        .select()
        .from(s.consents)
        .where(
          inArray(
            s.consents.registrationId,
            mine.map((r) => r.id),
          ),
        )
    : [];
  const consents =
    a.mode === 'demo'
      ? rawConsents
          .filter((c) => isCanonicalDemoConsentId(c.id))
          .map((c) => ({ ...c, ceilingCents: 3200, accepted: true }))
      : rawConsents;
  return {
    trip: d.trip,
    seatCents: d.seatCents,
    snapshot: d.snapshot,
    registrationCount: d.registrations.length,
    registrations: mine,
    obligations,
    operations: ownOps,
    receipts,
    totals: {
      required: d.totals.required,
      net: d.totals.net,
      gap: d.totals.gap,
      sponsorCommitted: d.totals.sponsorCommitted,
    },
    consents,
  };
}
export async function aggregateData(a: Actor) {
  const data = await dashboardData(a);
  return data.map((d) => ({
    trip: d.trip.name,
    tripId: d.trip.id,
    registrations: d.registrationCount,
    confirmedSeats: d.confirmedSeats,
    parentPaidSeats: d.coverage.parentPaidSeats,
    fullyAssistedSeats: d.coverage.fullyAssistedSeats,
    unresolvedSeats: d.coverage.unresolvedSeats,
    outstandingObligationCents: d.outstandingObligationCents,
    feePending: d.totals.feePending,
    feeReserveCents: d.totals.feeReserve,
    refundReserveCents: d.totals.refundReserve,
    schoolContributionCents: d.totals.schoolCents,
    seatCents: d.seatCents,
    requiredCents: d.totals.required,
    capturedCents: d.totals.gross,
    feeCents: d.totals.fees,
    refundCents: d.totals.refunds,
    netCents: d.totals.net,
    gapCents: d.totals.gap,
    sponsorshipCommittedCents: d.totals.sponsorCommitted,
    unresolved: d.totals.unresolved,
    ready: d.totals.ready,
    pricing: d.snapshot ? 'Frozen' : 'Estimated',
    simulation: a.mode === 'demo',
  }));
}
export async function ownObligation(a: Actor, id: string) {
  if (a.mode === 'demo' && !isCanonicalDemoObligationId(id))
    throw new AppError('Obligation not found', 404);
  const [ob] = await db.select().from(s.obligations).where(eq(s.obligations.id, id));
  if (!ob) throw new AppError('Obligation not found', 404);
  await ownTrip(a, ob.tripId);
  if (a.role === 'parent' && ob.userId !== a.userId)
    throw new AppError('Obligation not found', 404);
  assertMutableWorkspace(a);
  roles(a, ['parent', 'finance']);
  return ob;
}

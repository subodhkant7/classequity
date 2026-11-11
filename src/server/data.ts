import { and, eq, inArray, asc } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import type { Actor } from './auth';
import { roles } from './auth';
import { AppError, requireValue } from './errors';
import { funding, seatPrice, seatCoverage, availableCapture, syntheticNames } from '@/lib/domain';
import {
  assertMutableWorkspace,
  CANONICAL_DEMO_SNAPSHOT_ID,
  CANONICAL_DEMO_TIERS,
  CANONICAL_DEMO_TRIP_ID,
  canonicalDemoOperationStatus,
  canonicalDemoOperationIds,
  canonicalDemoObligationIds,
  canonicalDemoAllocationIds,
  canonicalDemoCaptureIds,
  canonicalDemoCommitmentIds,
  canonicalDemoConsentIds,
  isCanonicalDemoObligationId,
  canonicalDemoRegistrationIds,
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
  const demo = a.mode === 'demo';
  const rawRegs = await db
    .select()
    .from(s.registrations)
    .where(
      and(
        eq(s.registrations.tripId, id),
        demo
          ? inArray(s.registrations.id, canonicalDemoRegistrationIds)
          : eq(s.registrations.status, 'REGISTERED'),
      ),
    )
    .orderBy(asc(s.registrations.createdAt), asc(s.registrations.id));
  const regs = demo
    ? rawRegs.map((r) => ({
        ...r,
        student: syntheticNames[canonicalDemoRegistrationIds.indexOf(r.id)],
        status: 'REGISTERED',
      }))
    : rawRegs;
  const rawSnapshots = await db
    .select()
    .from(s.snapshots)
    .where(
      and(
        eq(s.snapshots.tripId, id),
        demo ? eq(s.snapshots.id, CANONICAL_DEMO_SNAPSHOT_ID) : undefined,
      ),
    );
  const rawSnapshot = rawSnapshots.at(0);
  const snapshot =
    demo && rawSnapshot
      ? {
          ...rawSnapshot,
          seatCents: 2300,
          count: 30,
          policy: CANONICAL_DEMO_TIERS.map((t) => ({ ...t })),
        }
      : rawSnapshot;
  const rawAllocations = await db
    .select()
    .from(s.assistance)
    .where(
      and(
        eq(s.assistance.tripId, id),
        demo
          ? inArray(s.assistance.id, canonicalDemoAllocationIds)
          : eq(s.assistance.status, 'APPROVED'),
      ),
    );
  const allocations = demo
    ? rawAllocations.map((x) => ({ ...x, status: 'APPROVED', cents: 2300 }))
    : rawAllocations;
  const rawSponsors = await db
    .select()
    .from(s.commitments)
    .where(
      and(
        eq(s.commitments.tripId, id),
        demo ? inArray(s.commitments.id, canonicalDemoCommitmentIds) : undefined,
      ),
    );
  const sponsorAmount = (id: string) => [5000, 2000, 4500][canonicalDemoCommitmentIds.indexOf(id)];
  const sponsors = demo
    ? rawSponsors.map((row) => ({ ...row, cents: sponsorAmount(row.id) }))
    : rawSponsors;
  const rawObs = await db
    .select()
    .from(s.obligations)
    .where(
      and(
        eq(s.obligations.tripId, id),
        demo ? inArray(s.obligations.id, canonicalDemoObligationIds) : undefined,
      ),
    );
  const obs = demo
    ? rawObs.map((row) => ({
        ...row,
        cents: row.commitmentId
          ? sponsorAmount(row.commitmentId)
          : canonicalDemoObligationIds.indexOf(row.id) < 25
            ? 2300
            : 0,
      }))
    : rawObs;
  const allOps = obs.length
    ? await db
        .select()
        .from(s.operations)
        .where(
          and(
            inArray(
              s.operations.obligationId,
              obs.map((o) => o.id),
            ),
            eq(s.operations.schoolId, a.schoolId),
            eq(s.operations.mode, a.mode),
            demo ? inArray(s.operations.id, canonicalDemoOperationIds) : undefined,
          ),
        )
    : [];
  const ops = demo
    ? allOps.map((o) => ({
        ...o,
        status: canonicalDemoOperationStatus(o.id)!,
        errorCode: null,
      }))
    : allOps;
  const allCaps = ops.length
    ? await db
        .select()
        .from(s.captures)
        .where(
          and(
            inArray(
              s.captures.operationId,
              ops.map((o) => o.id),
            ),
            eq(s.captures.provenance, demo ? 'SYNTHETIC' : 'PAYPAL_SANDBOX'),
            demo ? inArray(s.captures.id, canonicalDemoCaptureIds) : undefined,
          ),
        )
    : [];
  const caps = demo
    ? allCaps.map((c) => ({
        ...c,
        cents: c.id.startsWith('demo-sponsor-')
          ? sponsorAmount(c.id.replace(/-capture$/, ''))
          : 2300,
        feeCents: c.id === 'demo-sponsor-1-capture' ? 200 : 85,
        status: 'COMPLETED',
        refundedCents: 0,
        pendingRefundCents: 0,
        feeKnown: true,
      }))
    : allCaps.filter((c) => !!c.verifiedAt);
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
  const trips = await db
    .select({ id: s.trips.id })
    .from(s.trips)
    .where(
      and(
        eq(s.trips.schoolId, a.schoolId),
        a.mode === 'demo' ? eq(s.trips.id, CANONICAL_DEMO_TRIP_ID) : undefined,
      ),
    );
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
    .where(
      and(
        eq(s.assistance.tripId, id),
        a.mode === 'demo' ? inArray(s.assistance.id, canonicalDemoAllocationIds) : undefined,
      ),
    );
  const allocations =
    a.mode === 'demo'
      ? rawAllocations.map((x) => ({
          ...x,
          student: syntheticNames[canonicalDemoRegistrationIds.indexOf(x.registrationId)],
          status: 'APPROVED',
          cents: 2300,
        }))
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
          and(
            inArray(
              s.consents.registrationId,
              mine.map((r) => r.id),
            ),
            a.mode === 'demo' ? inArray(s.consents.id, canonicalDemoConsentIds) : undefined,
          ),
        )
    : [];
  const consents =
    a.mode === 'demo'
      ? rawConsents.map((c) => ({ ...c, ceilingCents: 3200, accepted: true }))
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

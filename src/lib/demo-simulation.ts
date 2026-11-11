import {
  availableCapture,
  funding,
  seatCoverage,
  seatPrice,
  type FundingCapture,
  type Tier,
} from './domain';
import type { dashboardData, financeData } from '@/server/data';

export type DemoTrip = Awaited<ReturnType<typeof dashboardData>>[number];
export type DemoFinance = Awaited<ReturnType<typeof financeData>>;

export interface DemoContributionInput {
  cents: number;
  source: string;
  evidence: string;
}

export function recomputeDemoTripFromFinance(trip: DemoTrip, finance: DemoFinance): DemoTrip {
  const captures: FundingCapture[] = finance.operations
    .map((o) => o.capture)
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({
      cents: c.cents,
      feeCents: c.feeCents,
      feeKnown: c.feeKnown,
      pendingRefundCents: c.pendingRefundCents,
      status: c.status,
      refundedCents: c.refundedCents,
    }));
  const schoolCents = finance.contributions.reduce((n, c) => n + c.cents, 0);
  const unresolved = finance.operations.filter((o) =>
    ['UNKNOWN', 'PENDING', 'CAPTURING', 'CREATING', 'REFUND_PENDING'].includes(o.status),
  ).length;
  const totals = funding({
    seatCents: trip.seatCents,
    registrations: trip.snapshot?.count ?? trip.registrationCount,
    assistedCents: finance.allocations
      .filter((x) => x.status === 'APPROVED')
      .reduce((n, x) => n + x.cents, 0),
    sponsorCommittedCents: trip.totals.sponsorCommitted,
    captures,
    unresolved,
    schoolCents,
  });
  const seatObs = finance.obligations.filter((o) => o.kind === 'SEAT');
  const seats = Array.from({ length: trip.registrationCount }, (_, idx) => {
    const ob = seatObs[idx];
    const op = finance.operations.find((o) => o.obligationId === ob?.id);
    const cap = op?.capture ?? null;
    return {
      parentDue: ob?.cents ?? trip.seatCents,
      paid:
        cap && ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(cap.status)
          ? Math.max(0, cap.cents - cap.refundedCents)
          : 0,
      available: cap ? availableCapture(cap) : 0,
    };
  });
  const coverage = seatCoverage(trip.seatCents, totals.net, seats);
  totals.ready =
    totals.ready &&
    !!trip.snapshot &&
    trip.snapshot.count === trip.registrationCount &&
    coverage.unresolvedSeats === 0;
  const outstandingObligationCents = finance.obligations.reduce((n, ob) => {
    const op = finance.operations.find((o) => o.obligationId === ob.id);
    const cap = op?.capture;
    const paid =
      cap && ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(cap.status)
        ? Math.max(0, cap.cents - cap.refundedCents)
        : 0;
    return n + Math.max(0, ob.cents - paid);
  }, 0);
  return {
    ...trip,
    totals,
    coverage,
    confirmedSeats: coverage.coveredSeats,
    outstandingObligationCents,
    payments: finance.operations.map((o) => ({
      id: o.id,
      status: o.status,
      mode: o.mode,
      createdAt:
        o.updatedAt instanceof Date ? o.updatedAt.toISOString() : String(o.updatedAt ?? ''),
    })),
  };
}

export function applyDemoPricingPreview(trip: DemoTrip, previewRegistrations: number): DemoTrip {
  const count = Math.max(1, Math.min(trip.trip.capacity || 500, Math.round(previewRegistrations)));
  const previewSeatCents = seatPrice(trip.trip.tiers, count);
  const captures: FundingCapture[] = [
    {
      cents: trip.totals.gross,
      feeCents: trip.totals.fees,
      feeKnown: true,
      pendingRefundCents: trip.totals.refundReserve,
      status: 'COMPLETED',
      refundedCents: trip.totals.refunds,
    },
  ];
  const totals = funding({
    seatCents: previewSeatCents,
    registrations: count,
    assistedCents: trip.totals.assistanceRequired,
    sponsorCommittedCents: trip.totals.sponsorCommitted,
    captures,
    unresolved: trip.totals.unresolved,
    schoolCents: trip.totals.schoolCents,
  });
  return {
    ...trip,
    registrationCount: count,
    seatCents: previewSeatCents,
    totals,
  };
}

export function applyDemoFundedSimulation(
  trip: DemoTrip,
  finance: DemoFinance,
): { trip: DemoTrip; finance: DemoFinance } {
  const updatedOperations = finance.operations.map((o) => {
    const existingCap = o.capture;
    const isCompleted = o.status === 'COMPLETED' && existingCap;
    const capId = existingCap?.id ?? `demo-sim-cap-${o.id}`;
    const feeCents = existingCap?.feeCents ?? 90;
    const updatedCap = {
      id: capId,
      operationId: o.id,
      providerId: existingCap?.providerId ?? `SIM-CAP-${o.id}`,
      cents: o.cents,
      feeCents,
      feeKnown: true,
      provenance: 'SYNTHETIC' as const,
      verifiedAt: null,
      providerUpdatedAt: null,
      status: 'COMPLETED',
      refundedCents: 0,
      pendingRefundCents: 0,
      createdAt: existingCap?.createdAt ?? new Date(),
    };
    return {
      ...o,
      status: 'COMPLETED',
      errorCode: null,
      version: o.version + (isCompleted ? 0 : 1),
      capture: updatedCap,
    };
  });

  const tempFinance: DemoFinance = {
    ...finance,
    operations: updatedOperations,
  };
  const tempTrip = recomputeDemoTripFromFinance(trip, tempFinance);
  let updatedContributions = [...finance.contributions];
  if (tempTrip.totals.gap > 0) {
    updatedContributions = [
      {
        id: 'treasury-demo-simulated-coverage',
        tripId: trip.trip.id,
        mode: 'demo',
        cents: tempTrip.totals.gap,
        source: 'Simulated school fee-coverage allocation',
        evidence: 'DEMO-SIMULATION: local browser scenario covering payment processor fees',
        authorizedBy: 'demo-finance',
        createdAt: new Date(),
      },
      ...updatedContributions.filter((c) => c.id !== 'treasury-demo-simulated-coverage'),
    ];
  }
  const finalFinance: DemoFinance = {
    ...tempFinance,
    contributions: updatedContributions,
  };
  return {
    trip: recomputeDemoTripFromFinance(trip, finalFinance),
    finance: finalFinance,
  };
}

export function applyDemoContributionSimulation(
  trip: DemoTrip,
  finance: DemoFinance,
  input: DemoContributionInput,
): { trip: DemoTrip; finance: DemoFinance } {
  const cents = Math.max(1, Math.round(input.cents));
  const source = input.source.trim();
  const evidence = input.evidence.trim();
  const id = `treasury-local-${source.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${evidence
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;
  const existing = finance.contributions.find((c) => c.id === id);
  if (existing && existing.cents !== cents) {
    throw new Error('Treasury reference already recorded with another amount.');
  }
  const updatedContributions = existing
    ? finance.contributions
    : [
        {
          id,
          tripId: trip.trip.id,
          mode: 'demo' as const,
          cents,
          source,
          evidence,
          authorizedBy: 'demo-finance',
          createdAt: new Date(),
        },
        ...finance.contributions,
      ];
  const updatedFinance: DemoFinance = {
    ...finance,
    contributions: updatedContributions,
  };
  return {
    trip: recomputeDemoTripFromFinance(trip, updatedFinance),
    finance: updatedFinance,
  };
}

export function applyDemoRefundSimulation(
  trip: DemoTrip,
  finance: DemoFinance,
  captureId: string,
  cents?: number,
  clientKey = `full-${captureId}`,
  seenKeys: Record<string, number> = {},
): {
  trip: DemoTrip;
  finance: DemoFinance;
  duplicate: boolean;
  seenKeys: Record<string, number>;
} {
  const targetOp = finance.operations.find((o) => o.capture?.id === captureId);
  const target = targetOp?.capture;
  if (!targetOp || !target) throw new Error('Capture not found');
  const amount = cents ?? target.cents - target.refundedCents;
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('Invalid refund amount or identity.');
  }
  const compositeKey = `${captureId}:${clientKey}`;
  if (compositeKey in seenKeys) {
    if (seenKeys[compositeKey] !== amount) {
      throw new Error('Refund identity reused with another amount.');
    }
    return { trip, finance, duplicate: true, seenKeys };
  }
  const remaining = target.cents - target.refundedCents - target.pendingRefundCents;
  if (amount > remaining) {
    throw new Error('Refund exceeds unreserved captured balance.');
  }
  const newRefunded = target.refundedCents + amount;
  const newStatus = newRefunded === target.cents ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
  const updatedOperations = finance.operations.map((o) =>
    o.capture?.id === captureId
      ? {
          ...o,
          status: newStatus,
          capture: {
            ...o.capture,
            status: newStatus,
            refundedCents: newRefunded,
          },
        }
      : o,
  );
  const updatedFinance: DemoFinance = {
    ...finance,
    operations: updatedOperations,
  };
  return {
    trip: recomputeDemoTripFromFinance(trip, updatedFinance),
    finance: updatedFinance,
    duplicate: false,
    seenKeys: { ...seenKeys, [compositeKey]: amount },
  };
}

export function previewSeatTierCents(tiers: Tier[], count: number): number {
  return seatPrice(tiers, count);
}

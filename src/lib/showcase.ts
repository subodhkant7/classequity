import { funding, seatPrice, seatCoverage, type Tier } from './domain';
import type { dashboardData } from '@/server/data';
export const showcaseTiers: Tier[] = [
  { min: 1, cents: 3200 },
  { min: 20, cents: 2700 },
  { min: 30, cents: 2300 },
];
export function pricingExample(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 40)
    throw Error('Use 1–40 fictional registrations');
  const cents = seatPrice(showcaseTiers, count);
  return {
    count,
    cents,
    total: count * cents,
    savings: count * (3200 - cents),
    next: showcaseTiers.find((t) => t.min > count) ?? null,
  };
}
export const initialFunding = {
  assisted: 5,
  pledged: 11500,
  sponsorPaid: 7000,
  parentPaid: 48300,
  fees: 2070,
};
export function fundingExample(input: typeof initialFunding) {
  if (Object.values(input).some((v) => !Number.isSafeInteger(v) || v < 0) || input.assisted > 30)
    throw Error('Invalid illustrative funding inputs');
  const parentDue = (30 - input.assisted) * 2300;
  const parentPaid = Math.min(input.parentPaid, parentDue);
  const sponsorPaid = Math.min(input.sponsorPaid, input.pledged);
  return {
    ...funding({
      seatCents: 2300,
      registrations: 30,
      assistedCents: input.assisted * 2300,
      sponsorCommittedCents: input.pledged,
      captures: [
        {
          cents: parentPaid + sponsorPaid,
          feeCents: input.fees,
          feeKnown: true,
          status: 'COMPLETED',
          refundedCents: 0,
        },
      ],
      unresolved: 0,
    }),
    parentDue,
    parentPaid,
    sponsorPaid,
  };
}
export const chapters = [
  {
    id: 'adventure',
    title: 'Plan an adventure',
    short: 'Plan',
    outcome: 'One reviewed activity. Clear dates, capacity and pricing.',
  },
  {
    id: 'quotation',
    title: 'Understand the quotation',
    short: 'Understand',
    outcome: 'Gemini extracts. A school administrator reviews and approves.',
  },
  {
    id: 'families',
    title: 'Bring families together',
    short: 'Participate',
    outcome: 'Participation unlocks a better estimate, within parent consent.',
  },
  {
    id: 'support',
    title: 'Include, privately',
    short: 'Include',
    outcome: 'Five supported seats need $115. Pledges alone are not funding.',
  },
  {
    id: 'payments',
    title: 'Verify every payment',
    short: 'Verify',
    outcome: 'A payment request is not a verified payment.',
  },
  {
    id: 'intelligence',
    title: 'See the whole picture',
    short: 'Understand the money',
    outcome: 'Real editable analytics. Aggregate data. Human financial authority.',
  },
] as const;
export type ChapterId = (typeof chapters)[number]['id'];
export function tourStep(current: number, action: 'next' | 'previous' | 'reset') {
  return action === 'reset'
    ? 0
    : Math.max(0, Math.min(chapters.length - 1, current + (action === 'next' ? 1 : -1)));
}
const date = new Date('2026-11-04T00:00:00Z');
const coverage = seatCoverage(2300, 53230, [
  ...Array.from({ length: 21 }, () => ({ parentDue: 2300, paid: 2300, available: 2215 })),
  ...Array.from({ length: 4 }, () => ({ parentDue: 2300, paid: 0, available: 0 })),
  ...Array.from({ length: 5 }, () => ({ parentDue: 0, paid: 0, available: 0 })),
]);
export const presentationOverview: Awaited<ReturnType<typeof dashboardData>> = [
  {
    trip: {
      id: 'presentation-science',
      schoolId: 'presentation-school',
      name: 'A day of discovery',
      destination: 'Fictional science museum',
      description: 'Admission, workshop and transport. Synthetic presentation data.',
      date: '2026-11-20',
      deadline: '2026-11-15',
      capacity: 40,
      tiers: showcaseTiers,
      state: 'FROZEN',
      reserveCents: 0,
      createdAt: date,
    },
    mode: 'demo',
    snapshot: {
      id: 'presentation-snapshot',
      tripId: 'presentation-science',
      seatCents: 2300,
      count: 30,
      policy: showcaseTiers,
      createdAt: date,
    },
    seatCents: 2300,
    totals: fundingExample(initialFunding),
    registrationCount: 30,
    confirmedSeats: coverage.coveredSeats,
    coverage,
    outstandingObligationCents: 13700,
    payments: ['COMPLETED', 'COMPLETED', 'PENDING', 'FAILED', 'UNKNOWN'].map((status, i) => ({
      id: `presentation-operation-${i}`,
      status,
      mode: 'demo' as const,
      createdAt: date.toISOString(),
    })),
  },
];
export const sandboxRecord = {
  captured: 100,
  refunded: 100,
  fees: 54,
  net: -54,
  status: 'REFUNDED',
  source: 'Recorded PayPal sandbox verification · November 5, 2026',
} as const;

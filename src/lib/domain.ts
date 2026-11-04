import { z } from 'zod';
export type Role = 'admin' | 'finance' | 'teacher' | 'parent';
export type Mode = 'demo' | 'sandbox';
export const tiersSchema = z
  .array(
    z.object({
      min: z.number().int().min(1).max(10000),
      cents: z.number().int().min(1).max(10000000),
    }),
  )
  .min(1)
  .max(12)
  .refine((t) => t.some((x) => x.min === 1), 'A tier starting at one student is required')
  .refine((t) => new Set(t.map((x) => x.min)).size === t.length, 'Thresholds must be unique')
  .refine(
    (t) => [...t].sort((a, b) => a.min - b.min).every((x, i, a) => !i || x.cents <= a[i - 1].cents),
    'Group prices must not increase',
  );
export type Tier = z.infer<typeof tiersSchema>[number];
export function seatPrice(tiers: Tier[], count: number) {
  if (!Number.isSafeInteger(count) || count < 0) throw Error('Invalid registration count');
  const tier = [...tiers].sort((a, b) => b.min - a.min).find((t) => t.min <= Math.max(1, count));
  if (!tier) throw Error('No applicable tier');
  return tier.cents;
}
export function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
export function decimal(cents: number) {
  if (!Number.isSafeInteger(cents) || cents < 0) throw Error('Invalid cents');
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
export function minor(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw Error('Invalid provider money');
  const [a, b = ''] = value.split('.');
  const n = Number(a) * 100 + Number(b.padEnd(2, '0'));
  if (!Number.isSafeInteger(n)) throw Error('Amount too large');
  return n;
}
export interface FundingInput {
  seatCents: number;
  registrations: number;
  assistedCents: number;
  sponsorCommittedCents: number;
  captures: { cents: number; feeCents: number; status: string; refundedCents: number }[];
  unresolved: number;
  reserveCents?: number;
}
export function funding(i: FundingInput) {
  const required = i.seatCents * i.registrations;
  const complete = i.captures.filter((c) =>
    ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(c.status),
  );
  const gross = complete.reduce((n, c) => n + c.cents, 0);
  const fees = complete.reduce((n, c) => n + c.feeCents, 0);
  const refunds = complete.reduce((n, c) => n + c.refundedCents, 0);
  const net = gross - fees - refunds + (i.reserveCents || 0);
  const gap = Math.max(0, required - net);
  return {
    required,
    gross,
    fees,
    refunds,
    net,
    gap,
    assistanceRequired: i.assistedCents,
    sponsorCommitted: i.sponsorCommittedCents,
    sponsorshipCommitmentGap: Math.max(0, i.assistedCents - i.sponsorCommittedCents),
    ready: gap === 0 && i.unresolved === 0 && i.registrations > 0,
    unresolved: i.unresolved,
  };
}
export const tripInput = z
  .object({
    name: z.string().trim().min(3).max(120),
    destination: z.string().trim().min(3).max(160),
    description: z.string().trim().min(10).max(2000),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    capacity: z.coerce.number().int().min(1).max(500),
    tiers: tiersSchema,
  })
  .refine((t) => t.deadline <= t.date, 'Deadline must be on or before departure');
export const quoteSchema = z.object({
  vendor: z.string(),
  currency: z.literal('USD'),
  capacity: z.number().int().positive().nullable(),
  date: z.string().nullable(),
  tiers: tiersSchema,
  discountConditions: z.array(z.string()),
  cancellationConditions: z.array(z.string()),
  uncertainties: z.array(z.string()),
  sourceReferences: z.array(z.string()),
});
export function canFinance(role: Role) {
  return role === 'finance';
}
export function canManage(role: Role) {
  return role === 'admin' || role === 'finance';
}
export const syntheticNames = [
  'Avery Chen',
  'Jordan Reed',
  'Riley Morgan',
  'Taylor Brooks',
  'Sam Rivera',
  'Casey Patel',
  'Alex Kim',
  'Jamie Wilson',
  'Quinn Parker',
  'Morgan Lee',
  'Drew Santos',
  'Skyler Davis',
  'Sage Miller',
  'Rowan Clark',
  'Charlie Wells',
  'Finley Shah',
  'Reese Bennett',
  'Emery Scott',
  'Dakota James',
  'Elliot Cruz',
  'Peyton Ellis',
  'Harper Singh',
  'Cameron Bell',
  'Blair Adams',
  'Hayden Ross',
  'River Hayes',
  'Robin Young',
  'Phoenix Green',
  'Ash Cooper',
  'Jules Baker',
];

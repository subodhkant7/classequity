import { describe, it, expect } from 'vitest';
import { seatPrice, decimal, minor, funding, tiersSchema, canFinance } from '../src/lib/domain';
const tiers = [
  { min: 1, cents: 3200 },
  { min: 20, cents: 2700 },
  { min: 30, cents: 2300 },
];
describe('exact-cent group clearing', () => {
  it('selects all boundary tiers', () => {
    expect([1, 19, 20, 29, 30, 40].map((n) => seatPrice(tiers, n))).toEqual([
      3200, 3200, 2700, 2700, 2300, 2300,
    ]);
  });
  it('requires $690 for 30 seats and $115 of approved aid', () => {
    const f = funding({
      seatCents: 2300,
      registrations: 30,
      assistedCents: 11500,
      sponsorCommittedCents: 11500,
      captures: [],
      unresolved: 0,
    });
    expect(f.required).toBe(69000);
    expect(f.assistanceRequired).toBe(11500);
    expect(25 * 2300).toBe(57500);
    expect(f.ready).toBe(false);
    expect(f.gap).toBe(69000);
  });
  it('counts only completed captures and deducts fees/refunds', () => {
    const f = funding({
      seatCents: 2300,
      registrations: 30,
      assistedCents: 11500,
      sponsorCommittedCents: 11500,
      unresolved: 1,
      captures: [
        { cents: 57500, feeCents: 1500, status: 'COMPLETED', refundedCents: 2300 },
        { cents: 11500, feeCents: 500, status: 'PENDING', refundedCents: 0 },
      ],
    });
    expect(f.net).toBe(53700);
    expect(f.gap).toBe(15300);
    expect(f.ready).toBe(false);
  });
  it('fees prevent a gross-funded cohort from claiming fully funded', () => {
    const f = funding({
      seatCents: 2300,
      registrations: 30,
      assistedCents: 11500,
      sponsorCommittedCents: 11500,
      unresolved: 0,
      captures: [{ cents: 69000, feeCents: 2000, status: 'COMPLETED', refundedCents: 0 }],
    });
    expect(f.gap).toBe(2000);
    expect(f.ready).toBe(false);
    expect(
      funding({
        ...{
          seatCents: 2300,
          registrations: 30,
          assistedCents: 11500,
          sponsorCommittedCents: 11500,
          unresolved: 0,
          captures: [{ cents: 69000, feeCents: 2000, status: 'COMPLETED', refundedCents: 0 }],
        },
        schoolCents: 2000,
      }).ready,
    ).toBe(true);
  });
  it('unresolved operations block readiness even when net covers cost', () => {
    expect(
      funding({
        seatCents: 2300,
        registrations: 1,
        assistedCents: 0,
        sponsorCommittedCents: 0,
        unresolved: 1,
        captures: [{ cents: 2500, feeCents: 0, status: 'COMPLETED', refundedCents: 0 }],
      }).ready,
    ).toBe(false);
  });
  it('serializes exact cents and rejects malformed provider amounts', () => {
    expect(decimal(2301)).toBe('23.01');
    expect(minor('23.01')).toBe(2301);
    expect(minor('0.10')).toBe(10);
    expect(() => minor('23.001')).toThrow();
    expect(() => minor('1e3')).toThrow();
    expect(() => decimal(0.1)).toThrow();
  });
  it('rejects increasing group prices and duplicate thresholds', () => {
    expect(
      tiersSchema.safeParse([
        { min: 1, cents: 2300 },
        { min: 20, cents: 3200 },
      ]).success,
    ).toBe(false);
    expect(
      tiersSchema.safeParse([
        { min: 1, cents: 2300 },
        { min: 1, cents: 2300 },
      ]).success,
    ).toBe(false);
  });
  it('requires a distinct finance role', () => {
    expect(canFinance('teacher')).toBe(false);
    expect(canFinance('admin')).toBe(false);
    expect(canFinance('finance')).toBe(true);
  });
});

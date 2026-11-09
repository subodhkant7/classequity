import { describe, it, expect } from 'vitest';
import {
  pricingExample,
  fundingExample,
  initialFunding,
  tourStep,
  presentationOverview,
  chapters,
} from '../src/lib/showcase';
describe('safe presentation calculations and navigation', () => {
  it('uses actual tier boundaries and the $270 cohort saving', () => {
    expect([19, 20, 29, 30].map((n) => pricingExample(n).cents)).toEqual([3200, 2700, 2700, 2300]);
    expect(pricingExample(30)).toMatchObject({ total: 69000, savings: 27000, next: null });
    expect(pricingExample(19).next?.min).toBe(20);
  });
  it('rejects fractional or outside-capacity registration counts', () => {
    for (const n of [0, 1.1, 41, NaN]) expect(() => pricingExample(n)).toThrow();
  });
  it('keeps commitments separate from captured money and deducts known fees', () => {
    const f = fundingExample(initialFunding);
    expect(f).toMatchObject({
      required: 69000,
      gross: 55300,
      net: 53230,
      gap: 15770,
      assistanceRequired: 11500,
      ready: false,
    });
    expect(fundingExample({ ...initialFunding, pledged: 69000 }).net).toBe(f.net);
  });
  it('bounds parent/sponsor payments without counting fully assisted seats as free', () => {
    const f = fundingExample({
      ...initialFunding,
      assisted: 30,
      parentPaid: 69000,
      sponsorPaid: 69000,
      pledged: 11500,
      fees: 0,
    });
    expect(f).toMatchObject({ parentPaid: 0, sponsorPaid: 11500, required: 69000, gap: 57500 });
    expect(() => fundingExample({ ...initialFunding, fees: -1 })).toThrow();
  });
  it('navigates six chapters and resets from any chapter without wraparound', () => {
    expect(chapters).toHaveLength(6);
    expect(tourStep(0, 'previous')).toBe(0);
    expect(tourStep(5, 'next')).toBe(5);
    expect(tourStep(4, 'reset')).toBe(0);
    expect(tourStep(2, 'next')).toBe(3);
  });
  it('uses internally consistent anonymous synthetic Studio aggregates', () => {
    const d = presentationOverview[0];
    expect(d.confirmedSeats).toBe(23);
    expect(d.coverage).toMatchObject({
      parentPaidSeats: 21,
      fullyAssistedSeats: 5,
      unresolvedSeats: 7,
    });
    expect(d.totals.net).toBe(53230);
    expect(JSON.stringify(d)).not.toMatch(/parentId|registrationId|phone|approvedBy/);
  });
});

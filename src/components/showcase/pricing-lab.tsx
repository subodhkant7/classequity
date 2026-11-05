'use client';
import { useHydrated } from '../use-hydrated';
import { useState } from 'react';
import { ArrowDown, Check } from 'lucide-react';
import { money } from '@/lib/domain';
import { pricingExample, showcaseTiers } from '@/lib/showcase';
export function PricingLab({
  compact = false,
  initial = 30,
}: {
  compact?: boolean;
  initial?: number;
}) {
  const hydrated = useHydrated();
  const [count, setCount] = useState(initial);
  const p = pricingExample(count);
  return (
    <div className={`pricing-lab ${compact ? 'compact' : ''}`}>
      <div className="spread">
        <span className="eyebrow">Together goes further</span>
        <span className="local-label">Interactive illustration</span>
      </div>
      <div className="pricing-head">
        <div>
          <strong aria-live="polite">{money(p.cents)}</strong>
          <span>per learner</span>
        </div>
        <div className="registration-count">
          <b>{count}</b>
          <span>registrations</span>
        </div>
      </div>
      <label className="range-label">
        {compact ? 'Explore group pricing' : 'Number of students'}
        <input
          aria-label={compact ? 'Explore group pricing' : 'Number of students'}
          type="range"
          disabled={!hydrated}
          min="1"
          max="40"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
      </label>
      <div className="pricing-tiers">
        {showcaseTiers.map((t, i) => (
          <div key={t.min} className={t.cents === p.cents ? 'selected' : ''}>
            <span>{i === 0 ? '1–19' : i === 1 ? '20–29' : '30+'} learners</span>
            <b>{money(t.cents)}</b>
            {t.cents === p.cents && <Check size={13} aria-label="Current tier" />}
          </div>
        ))}
      </div>
      <div className="price-summary" aria-live="polite">
        <span>
          {count} × {money(p.cents)}
          <strong>{money(p.total)} total</strong>
        </span>
        <span>
          <ArrowDown size={15} />
          {money(p.savings)} below $32 per seat
        </span>
      </div>
      {!compact && (
        <p className="fine-print">
          {p.next
            ? `${p.next.min - count} more registrations reach ${money(p.next.cents)} per seat.`
            : 'Best configured tier reached.'}{' '}
          These are estimates until the school freezes a consented price.
        </p>
      )}
    </div>
  );
}

'use client';
import { useHydrated } from '../use-hydrated';
import { useState } from 'react';
import { LockKeyhole, RotateCcw } from 'lucide-react';
import { money } from '@/lib/domain';
import { initialFunding, fundingExample } from '@/lib/showcase';
export function FundingLab() {
  const hydrated = useHydrated();
  const [input, setInput] = useState({ ...initialFunding });
  const f = fundingExample(input);
  const update = (key: keyof typeof initialFunding, value: number) =>
    setInput((v) => ({ ...v, [key]: value }));
  return (
    <div className="funding-lab">
      <div className="lab-controls">
        <span className="eyebrow">30 seats · $23 each · illustrative ledger</span>
        <h3>
          Promises are a beginning.
          <br />
          Verified money funds the trip.
        </h3>
        <label className="range-label">
          Fully assisted seats <b>{input.assisted}</b>
          <input
            aria-label="Fully assisted seats"
            type="range"
            disabled={!hydrated}
            min="0"
            max="30"
            value={input.assisted}
            onChange={(e) => update('assisted', Number(e.target.value))}
          />
        </label>
        {[
          { key: 'pledged', label: 'Sponsor commitments (USD)', value: input.pledged, max: 200000 },
          {
            key: 'sponsorPaid',
            label: 'Confirmed sponsor payments (USD)',
            value: f.sponsorPaid,
            max: input.pledged,
          },
          {
            key: 'parentPaid',
            label: 'Confirmed parent payments (USD)',
            value: f.parentPaid,
            max: f.parentDue,
          },
          { key: 'fees', label: 'Known processing fees (USD)', value: input.fees, max: 100000 },
        ].map((c) => (
          <label className="money-control" key={c.key}>
            <span>{c.label}</span>
            <input
              aria-label={c.label}
              type="number"
              disabled={!hydrated}
              min="0"
              max={c.max / 100}
              step="0.01"
              value={c.value / 100}
              onChange={(e) =>
                update(
                  c.key as keyof typeof initialFunding,
                  Math.max(0, Math.min(c.max, Math.round(Number(e.target.value) * 100))),
                )
              }
            />
          </label>
        ))}
        <button className="text-button" onClick={() => setInput({ ...initialFunding })}>
          <RotateCcw size={14} />
          Reset funding example
        </button>
      </div>
      <div className="funding-visual">
        <div className="spread">
          <span className="local-label">Local simulation · no transactions</span>
          <LockKeyhole size={17} />
        </div>
        <h3>
          {money(f.required)}
          <small>required for 30 seats</small>
        </h3>
        <div
          className="funding-track"
          aria-label={`${Math.max(0, Math.round((f.net / f.required) * 100))}% of cost funded net`}
        >
          <span style={{ width: `${Math.max(0, Math.min(100, (f.net / f.required) * 100))}%` }} />
        </div>
        <dl className="ledger-list">
          <div>
            <dt>Parent payments</dt>
            <dd>{money(f.parentPaid)}</dd>
          </div>
          <div>
            <dt>Confirmed sponsor payments</dt>
            <dd>{money(f.sponsorPaid)}</dd>
          </div>
          <div>
            <dt>Processing fees · illustrative input</dt>
            <dd>−{money(f.fees)}</dd>
          </div>
          <div className="ledger-total">
            <dt>Net available</dt>
            <dd data-testid="simulator-net">{money(f.net)}</dd>
          </div>
          <div>
            <dt>Remaining shortfall</dt>
            <dd data-testid="simulator-gap">{money(f.gap)}</dd>
          </div>
        </dl>
        <div className="support-note">
          <strong>{money(input.assisted * 2300)} of support needed</strong>
          <p>
            {money(input.pledged)} committed. Only {money(f.sponsorPaid)} confirmed. Recipient
            identities stay private.
          </p>
        </div>
        <p className="fine-print">
          {f.gap === 0
            ? 'This illustration covers the cost after the entered fees. Real readiness also requires frozen consent and resolved operations.'
            : 'A pledge or registration never counts as captured money.'}{' '}
          Fees here are example costs, not PayPal pricing.
        </p>
      </div>
    </div>
  );
}

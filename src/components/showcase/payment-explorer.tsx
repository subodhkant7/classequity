'use client';
import { useHydrated } from './use-hydrated';
import { useState } from 'react';
import { Check, ArrowRight, ShieldCheck, RotateCcw } from 'lucide-react';
import { money } from '@/lib/domain';
import { sandboxRecord } from '@/lib/showcase';
const steps = [
  'Order created',
  'Awaiting approval',
  'Buyer approved',
  'Capture attempted',
  'Verified capture',
  'Refund verified',
];
export function PaymentExplorer() {
  const hydrated = useHydrated();
  const [step, setStep] = useState(0);
  const [outcome, setOutcome] = useState<'verified' | 'unknown' | 'refund'>('refund');
  const [duplicate, setDuplicate] = useState(false);
  const unknown = outcome === 'unknown' && step >= 4;
  const current = unknown
    ? 'UNKNOWN'
    : step === 5
      ? 'REFUNDED'
      : step === 4
        ? 'COMPLETED'
        : step === 3
          ? 'CAPTURING'
          : step === 2
            ? 'APPROVED'
            : 'AWAITING_APPROVAL';
  return (
    <div className="payment-explorer">
      <div className="payment-controls">
        <span className="eyebrow">Follow the evidence</span>
        <h3>
          A payment request is not
          <br />a verified payment.
        </h3>
        <label className="range-label">
          Illustrative outcome
          <select
            aria-label="Payment example outcome"
            disabled={!hydrated}
            value={outcome}
            onChange={(e) => {
              setOutcome(e.target.value as typeof outcome);
              setStep(0);
              setDuplicate(false);
            }}
          >
            <option value="refund">Capture, then full refund</option>
            <option value="verified">Verified capture</option>
            <option value="unknown">Unknown provider outcome</option>
          </select>
        </label>
        <ol className="state-steps">
          {steps.slice(0, outcome === 'refund' ? 6 : 5).map((label, i) => (
            <li key={label} className={step === i ? 'current' : step > i ? 'done' : ''}>
              <span>{step > i ? <Check size={13} /> : i + 1}</span>
              {unknown && i === 4 ? 'Outcome unknown' : label}
            </li>
          ))}
        </ol>
        <div className="button-row">
          <button
            className="public-button"
            disabled={!hydrated || step >= (outcome === 'refund' ? 5 : 4)}
            onClick={() => setStep((v) => v + 1)}
          >
            Next state <ArrowRight size={16} />
          </button>
          <button
            className="text-button"
            onClick={() => {
              setStep(0);
              setDuplicate(false);
            }}
          >
            <RotateCcw size={14} />
            Reset states
          </button>
        </div>
        <p className="fine-print">Interactive state illustration. No PayPal request is sent.</p>
      </div>
      <div className="payment-proof">
        <span className={`state-stamp ${unknown ? 'uncertain' : ''}`} aria-live="polite">
          {current}
        </span>
        <div className="example-balance" aria-live="polite">
          <span>Illustrative available funds</span>
          <strong>{money(unknown || step < 4 ? 0 : step === 5 ? -54 : 46)}</strong>
        </div>
        <p>
          {unknown
            ? 'Keep the outcome unresolved. Read back the existing operation; never create a fresh charge to guess what happened.'
            : step === 5
              ? 'A full refund removes the capture from available funding. A retained fee can leave net funds negative.'
              : step === 4
                ? 'Completion, amount and association are verified from provider readback. Fees reduce the money available.'
                : 'Buyer approval and capture intent are separate from verified completion. The application waits for evidence.'}
        </p>
        {step === 4 && !unknown && (
          <button className="public-button secondary" onClick={() => setDuplicate(true)}>
            Repeat illustrative capture request
          </button>
        )}
        {duplicate && (
          <p role="status" className="support-note">
            Same operation. One capture. No additional charge in this illustration.
          </p>
        )}
        <div className="recorded-evidence">
          <ShieldCheck size={21} />
          <div>
            <span className="eyebrow">Recorded provider evidence</span>
            <h4>One real sandbox verification.</h4>
            <dl className="ledger-list">
              <div>
                <dt>Captured</dt>
                <dd>{money(sandboxRecord.captured)}</dd>
              </div>
              <div>
                <dt>Refunded</dt>
                <dd>{money(sandboxRecord.refunded)}</dd>
              </div>
              <div>
                <dt>Provider fee retained</dt>
                <dd>{money(sandboxRecord.fees)}</dd>
              </div>
              <div className="ledger-total">
                <dt>Final net</dt>
                <dd>{money(sandboxRecord.net)}</dd>
              </div>
            </dl>
            <p className="fine-print">
              {sandboxRecord.source}. Capture and refund independently read back; duplicate request
              kept one capture. Sandbox only, not a real school contribution. Genuine public webhook
              delivery remains unverified.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

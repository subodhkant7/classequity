'use client';
import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  SkipForward,
  Check,
  LockKeyhole,
  FileSearch,
  ShieldCheck,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';
import { chapters, tourStep, presentationOverview } from '@/lib/showcase';
import { PricingLab } from './pricing-lab';
import { FundingLab } from './funding-lab';
import { PaymentExplorer } from './payment-explorer';
import { TripScene } from './trip-scene';
const Studio = dynamic(() => import('../studio'), {
  ssr: false,
  loading: () => (
    <p role="status" className="studio-loading">
      Loading the real AG Studio component…
    </p>
  ),
});
function QuoteChapter() {
  const [review, setReview] = useState(false);
  const [approved, setApproved] = useState(false);
  return (
    <div className="quote-chapter">
      <div className="quote-paper">
        <span className="eyebrow">Sample vendor quotation · Q-CE-2026-001</span>
        <h3>
          Exploratorium
          <br />
          Learning Visits
        </h3>
        <p>
          Prepared for Oakwood Academy
          <br />
          November 20, 2026 · 40 places
        </p>
        <dl className="ledger-list">
          <div>
            <dt>1–19 students</dt>
            <dd>$32.00</dd>
          </div>
          <div>
            <dt>20–29 students</dt>
            <dd>$27.00</dd>
          </div>
          <div>
            <dt>30+ students</dt>
            <dd>$23.00</dd>
          </div>
        </dl>
        <p>
          Admission, guided workshop and return transport included. After November 15, request a
          written cancellation quote.
        </p>
        <a href="/sample-vendor-quote.svg" target="_blank" rel="noreferrer" className="text-button">
          Open sample vendor quotation ↗
        </a>
      </div>
      <div className="quote-extraction">
        <FileSearch size={30} />
        <span className="local-label">Recorded Gemini extraction</span>
        <h3>Structure, with a review step.</h3>
        <p>
          Gemini returned the three configured tiers. Its recorded result had no extraction
          uncertainties. That does not replace checking the source or resolving later cancellation
          terms.
        </p>
        <button
          className="public-button secondary"
          onClick={() => setReview(!review)}
          aria-expanded={review}
        >
          {review ? 'Hide' : 'Review'} extracted fields
        </button>
        {review && (
          <dl className="extracted-fields">
            <div>
              <dt>Currency</dt>
              <dd>USD</dd>
            </div>
            <div>
              <dt>Thresholds</dt>
              <dd>1 · 20 · 30</dd>
            </div>
            <div>
              <dt>Seat cents</dt>
              <dd>3200 · 2700 · 2300</dd>
            </div>
            <div>
              <dt>Recorded uncertainties</dt>
              <dd>None returned</dd>
            </div>
          </dl>
        )}
        <label className="consent-check">
          <input
            type="checkbox"
            checked={approved}
            onChange={(e) => setApproved(e.target.checked)}
          />
          I reviewed the sample quotation and approve these tiers for this demonstration.
        </label>
        {approved && (
          <p className="chapter-success" role="status">
            <CheckCircle2 size={17} />
            Reviewed in this browser only. No activity or price was saved.
          </p>
        )}
        <Link href="/trips" className="text-button">
          Open genuine authenticated quote review ↗
        </Link>
      </div>
    </div>
  );
}
function FamiliesChapter() {
  const [count, setCount] = useState(19);
  const [consent, setConsent] = useState(false);
  const [hindi, setHindi] = useState(false);
  return (
    <div className="families-chapter">
      <div className="parent-illustration">
        <div className="spread">
          <span className="eyebrow">Private parent portal</span>
          <LockKeyhole size={19} />
        </div>
        <h3>A day of discovery</h3>
        <p>School invitation → your own registration → clear consent.</p>
        <div className="before-after">
          <div>
            <small>19 registrations</small>
            <strong>$32</strong>
          </div>
          <ArrowRight />
          <div>
            <small>{count} registrations</small>
            <strong>{count >= 30 ? '$23' : count >= 20 ? '$27' : '$32'}</strong>
          </div>
        </div>
        <label className="consent-check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I consent to a maximum seat price of $32 for this demonstration.
        </label>
        <button
          className="public-button"
          disabled={!consent || count >= 40}
          onClick={() => setCount((n) => n + 1)}
        >
          Add sample registration <ArrowRight size={15} />
        </button>
        <p aria-live="polite" className="chapter-success">
          {count} sample registrations.{' '}
          {count >= 30
            ? 'The $23 group tier is unlocked.'
            : count >= 20
              ? 'The $27 group tier is unlocked.'
              : 'One more reaches the $27 estimate.'}
        </p>
        <p className="fine-print">
          No name, invitation token or registration is collected. Only this local illustration
          changes.
        </p>
      </div>
      <div className="demo-chat">
        <span className="eyebrow">
          <MessageCircle size={14} />A familiar way to ask
        </span>
        <div className="segmented" aria-label="Illustrative conversation language">
          <button aria-pressed={!hindi} onClick={() => setHindi(false)}>
            English
          </button>
          <button aria-pressed={hindi} onClick={() => setHindi(true)}>
            हिन्दी
          </button>
        </div>
        <p className="chat-bubble question" lang={hindi ? 'hi' : 'en'}>
          {hindi ? 'क्या कीमत बदल सकती है?' : 'Can the price change?'}
        </p>
        <p key={String(hindi)} className="chat-bubble answer typing" lang={hindi ? 'hi' : 'en'}>
          {hindi
            ? 'समूह बढ़ने पर अनुमानित कीमत कम हो सकती है। अंतिम कीमत आपकी सहमति की सीमा में स्कूल की पुष्टि के बाद तय होगी।'
            : 'Group participation can lower the estimate. The school freezes the final price within your approved ceiling; a frozen obligation cannot silently increase.'}
        </p>
        <p className="fine-print">
          Illustrative approved-information answer. The real parent assistant calls Gemini. Hosted
          Twilio callbacks remain unverified.
        </p>
        <Link href="/parent" className="text-button">
          Open the authenticated parent experience ↗
        </Link>
      </div>
    </div>
  );
}
function SupportChapter() {
  const [role, setRole] = useState('Teacher');
  return (
    <div>
      <div className="privacy-views">
        <div className="segmented" aria-label="Illustrated role perspective">
          {['Teacher', 'Finance', 'Sponsor'].map((r) => (
            <button key={r} aria-pressed={role === r} onClick={() => setRole(r)}>
              {r}
            </button>
          ))}
        </div>
        <p aria-live="polite">
          <LockKeyhole size={16} />
          {role === 'Teacher'
            ? 'Aggregate participation and funding only. No recipient mappings.'
            : role === 'Finance'
              ? 'The actual application restricts allocation review to separately authorized finance. This public illustration reveals no recipients.'
              : 'A voluntary commitment and aggregate support need. No family identities or eligibility data.'}
        </p>
        <small>
          Interactive privacy illustration. This selector grants no access to the real workspace.
        </small>
      </div>
      <FundingLab />
    </div>
  );
}
export function DemoTour({ initialChapter = 0 }: { initialChapter?: number }) {
  const [chapter, setChapter] = useState(initialChapter);
  const [replay, setReplay] = useState(0);
  const [skip, setSkip] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const c = chapters[chapter];
  const go = (n: number) => {
    setChapter(n);
    setReplay(0);
    window.history.replaceState(null, '', `/demo?chapter=${chapters[n].id}`);
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  };
  return (
    <div className="tour public-wrap" data-motion={skip ? 'skip' : 'normal'}>
      <header className="tour-header">
        <div>
          <span className="eyebrow">The complete product, in six chapters</span>
          <h1>
            Your next school adventure,
            <br />
            <em>with everyone included.</em>
          </h1>
        </div>
        <span className="local-label">
          <ShieldCheck size={14} />
          No sign-in. No provider calls. No saved changes.
        </span>
      </header>
      <nav className="chapter-nav" aria-label="Demo chapters">
        {chapters.map((ch, i) => (
          <button
            key={ch.id}
            aria-current={chapter === i ? 'step' : undefined}
            onClick={() => go(i)}
          >
            <span>{i < chapter ? <Check size={14} /> : String(i + 1).padStart(2, '0')}</span>
            {ch.short}
          </button>
        ))}
      </nav>
      <div className="tour-progress" aria-label={`Chapter ${chapter + 1} of ${chapters.length}`}>
        <span style={{ width: `${((chapter + 1) / chapters.length) * 100}%` }} />
      </div>
      <div className="chapter-title">
        <div>
          <span className="eyebrow">Chapter {chapter + 1} / 6</span>
          <h2 tabIndex={-1} ref={heading}>
            {c.title}
          </h2>
        </div>
        <div className="tour-options">
          <button className="text-button" onClick={() => setReplay((n) => n + 1)}>
            <RotateCcw size={14} />
            Replay chapter
          </button>
          <button className="text-button" aria-pressed={skip} onClick={() => setSkip(!skip)}>
            <SkipForward size={14} />
            {skip ? 'Motion skipped' : 'Skip animation'}
          </button>
        </div>
      </div>
      <div className="chapter-stage" key={`${chapter}-${replay}`}>
        {chapter === 0 ? (
          <div className="adventure-chapter">
            <div>
              <TripScene />
              <div className="trip-facts">
                <span>Oakwood Academy · demo school</span>
                <strong>A day of discovery</strong>
                <span>Nov 20, 2026 · 40 places · consent deadline Nov 15</span>
              </div>
            </div>
            <PricingLab initial={19} />
          </div>
        ) : chapter === 1 ? (
          <QuoteChapter />
        ) : chapter === 2 ? (
          <FamiliesChapter />
        ) : chapter === 3 ? (
          <SupportChapter />
        ) : chapter === 4 ? (
          <PaymentExplorer />
        ) : (
          <div className="intelligence-chapter">
            <div className="studio-explanation">
              <span className="local-label">Real AG Studio · sample aggregates</span>
              <h3>
                Ask a better question.
                <br />
                Build a clearer view.
              </h3>
              <p>
                The authenticated Gemini Agent Framework can create native editable report views
                from permitted aggregate data. Try the recorded AI-view replay below. It does not
                call Gemini, save a report or authorize money movement.
              </p>
              <Link href="/analytics" className="text-button">
                Open the genuine authenticated AG Studio workspace ↗
              </Link>
            </div>
            <div className="public-studio">
              <Studio overview={presentationOverview} presentation />
            </div>
          </div>
        )}
      </div>
      <div className="chapter-outcome" role="status">
        <CheckCircle2 size={21} />
        <p>
          <span>What this chapter makes clear</span>
          <strong>{c.outcome}</strong>
        </p>
      </div>
      <footer className="tour-controls">
        <button
          className="public-button secondary"
          disabled={chapter === 0}
          onClick={() => go(tourStep(chapter, 'previous'))}
        >
          <ArrowLeft size={16} />
          Previous chapter
        </button>
        <button
          className="text-button"
          onClick={() => {
            go(tourStep(chapter, 'reset'));
            setSkip(false);
            setReplay((n) => n + 1);
          }}
        >
          <RotateCcw size={14} />
          Reset demonstration
        </button>
        {chapter < 5 ? (
          <button className="public-button" onClick={() => go(tourStep(chapter, 'next'))}>
            Next chapter <ArrowRight size={16} />
          </button>
        ) : (
          <Link href="/login" className="public-button">
            Enter School Workspace <ArrowRight size={16} />
          </Link>
        )}
      </footer>
      <p className="fine-print tour-note">
        Explore freely or follow in order for an approximately three-minute introduction. The
        workspace link leaves this isolated tour and opens the separate authenticated product.
      </p>
    </div>
  );
}

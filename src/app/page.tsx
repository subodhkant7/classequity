import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  LockKeyhole,
  Users,
  Compass,
  Wallet,
  FileSpreadsheet,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  HeartHandshake,
  ChartNoAxesCombined,
  FileSearch,
} from 'lucide-react';
import { PublicShell, ActionLink, SectionHeading } from '@/components/showcase/public-shell';
import { TripScene } from '@/components/showcase/trip-scene';
import { PricingLab } from '@/components/showcase/pricing-lab';
import { RecordedAI } from '@/components/showcase/recorded-ai';
const pillars = [
  {
    icon: Compass,
    title: 'Plan together.',
    copy: 'One activity, reviewed information and a shared place to begin.',
    chapter: 'adventure',
    preview: 'Museum visit · 40 places · Nov 20',
  },
  {
    icon: Users,
    title: 'Unlock fairer pricing.',
    copy: 'More participation can unlock a better group estimate, within parent consent.',
    chapter: 'families',
    preview: '19 → 30 learners · $32 → $23 each',
  },
  {
    icon: HeartHandshake,
    title: 'Support privately.',
    copy: 'Make room for every learner without putting family circumstances on display.',
    chapter: 'support',
    preview: '5 fully assisted seats · $115 needed',
  },
  {
    icon: ShieldCheck,
    title: 'Verify every payment.',
    copy: 'Look past promises and screenshots to provider evidence, fees and refunds.',
    chapter: 'payments',
    preview: 'Request → readback → reconciled ledger',
  },
];
const previews = [
  {
    title: 'A calmer school dashboard',
    icon: Compass,
    chapter: 'adventure',
    kicker: 'School coordination',
    text: 'A reviewed activity, registrations and financial readiness in one place.',
    value: '30 learners',
    detail: 'A day of discovery',
  },
  {
    title: 'A clearer parent portal',
    icon: Users,
    chapter: 'families',
    kicker: 'Family experience',
    text: 'One private invitation. Clear consent. A price you can understand.',
    value: '$23 / seat',
    detail: 'Estimate · consent required',
  },
  {
    title: 'Inclusion without exposure',
    icon: HeartHandshake,
    chapter: 'support',
    kicker: 'Confidential support',
    text: 'Aggregate support for teachers; recipient mappings for authorized finance only.',
    value: '$115',
    detail: 'Five seats · identities private',
  },
  {
    title: 'Evidence before certainty',
    icon: Wallet,
    chapter: 'payments',
    kicker: 'PayPal lifecycle',
    text: 'Approval, capture, fees and refunds have distinct meanings.',
    value: 'REFUNDED',
    detail: 'Recorded $1 sandbox verification',
  },
  {
    title: 'A real report you can shape',
    icon: ChartNoAxesCombined,
    chapter: 'intelligence',
    kicker: 'AG Studio / AG Grid',
    text: 'Native editable charts, custom widgets and aggregate AI intelligence.',
    value: '$157.70 gap',
    detail: 'Synthetic cohort · $532.30 net',
  },
  {
    title: 'A familiar conversation',
    icon: MessageCircle,
    chapter: 'families',
    kicker: 'Parent communication',
    text: 'Grounded answers and secure links through the communication workflow.',
    value: 'English / हिन्दी',
    detail: 'Live WhatsApp delivery unverified',
  },
];
export default function Home() {
  return (
    <PublicShell>
      <section className="hero public-wrap">
        <div className="hero-copy">
          <span className="eyebrow">
            <i />
            School adventures, shared fairly
          </span>
          <h1>
            Every child deserves a place in the <em>adventure.</em>
          </h1>
          <p>
            Plan school activities, unlock better group prices, protect families’ privacy, and know
            exactly when every seat is funded.
          </p>
          <div className="button-row">
            <ActionLink href="/demo">Explore Interactive Demo</ActionLink>
            <ActionLink href="/how-it-works" secondary>
              See How It Works
            </ActionLink>
          </div>
          <div className="hero-footnote">
            <span className="tiny-avatar">30</span>
            <span>
              Built around participation.
              <br />
              <strong>Grounded in financial evidence.</strong>
            </span>
          </div>
        </div>
        <div className="hero-art">
          <div className="scene-label">
            <span className="status-dot" />
            Oakwood Academy <small>Fictional school · real product mechanics</small>
          </div>
          <TripScene />
          <div className="hero-pricing">
            <PricingLab compact />
          </div>
          <div className="hero-privacy">
            <LockKeyhole size={15} />
            <span>Support stays private.</span>
          </div>
        </div>
      </section>
      <div className="trust-ribbon">
        <span>
          Thoughtful technology.
          <br />
          <strong>Clear human authority.</strong>
        </span>
        <div>
          {['PayPal', 'Gemini', 'Twilio', 'AG Studio', 'APIMatic', 'Render'].map((n) => (
            <Link href="/technology" key={n}>
              {n}
            </Link>
          ))}
        </div>
        <small>Sandbox verified · synthetic demo · pre-deployment</small>
      </div>
      <section className="public-section public-wrap problem-section reveal">
        <SectionHeading
          eyebrow="The trip should be the adventure"
          title="Less chasing. More possibility."
        >
          A good school day out shouldn’t start with six disconnected conversations.
        </SectionHeading>
        <div className="problem-flow">
          <div className="fragments">
            {[
              { i: FileSpreadsheet, t: 'Registration spreadsheets' },
              { i: Users, t: 'Changing group prices' },
              { i: MessageCircle, t: 'WhatsApp questions' },
              { i: LockKeyhole, t: 'Private support requests' },
              { i: ReceiptText, t: 'Payment screenshots' },
              { i: Wallet, t: 'Unreconciled collections' },
            ].map(({ i: Icon, t }, n) => (
              <div key={t} style={{ rotate: `${n % 2 === 0 ? -2 : 2}deg` }}>
                <Icon size={17} />
                {t}
              </div>
            ))}
          </div>
          <div className="problem-resolution">
            <span className="eyebrow">A shared place to move forward</span>
            <h3>
              One trip.
              <br />A clearer picture.
            </h3>
            <p>
              ClassEquity connects the plan, the people and the money—while keeping family support
              confidential.
            </p>
            <Link className="text-button" href="/demo">
              Walk through the product <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <section className="public-section public-wrap reveal">
        <SectionHeading
          eyebrow="From first idea to funded seats"
          title="A little coordination. A lot of belonging."
        />
        <div className="pillar-grid">
          {pillars.map((p, i) => (
            <Link
              className={`pillar pillar-${i}`}
              key={p.title}
              href={`/demo?chapter=${p.chapter}`}
            >
              <span className="pillar-number">0{i + 1}</span>
              <p.icon size={30} strokeWidth={1.5} />
              <h3>{p.title}</h3>
              <p>{p.copy}</p>
              <div className="pillar-preview">
                {p.preview}
                <ArrowUpRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="ai-section public-section">
        <div className="public-wrap">
          <SectionHeading
            eyebrow="AI that helps. People who decide."
            title="Useful intelligence, in the right places."
          >
            Gemini helps turn documents, questions and financial aggregates into clarity. It never
            approves support or moves money.
          </SectionHeading>
          <RecordedAI />
        </div>
      </section>
      <section className="public-section public-wrap reveal">
        <SectionHeading
          eyebrow="Meet your everyday workspace"
          title="One coherent experience. Different points of view."
        >
          Application-derived previews. Open a chapter to try the workflow, then step into the
          functional workspace when you’re ready.
        </SectionHeading>
        <div className="preview-grid">
          {previews.map((p, i) => (
            <Link className="product-preview" key={p.title} href={`/demo?chapter=${p.chapter}`}>
              <div className={`preview-art preview-art-${i}`}>
                <span className="preview-window-dots">•••</span>
                <p.icon size={29} strokeWidth={1.5} />
                <strong>{p.value}</strong>
                <small>{p.detail}</small>
              </div>
              <span className="eyebrow">{p.kicker}</span>
              <h3>
                {p.title}
                <ArrowUpRight size={16} />
              </h3>
              <p>{p.text}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="integrity-section public-wrap public-section reveal">
        <div>
          <span className="eyebrow">Trust begins with the boundary</span>
          <h2>
            Private by intent.
            <br />
            <em>Clear about the money.</em>
          </h2>
          <p>
            School communities deserve clarity without exposure. ClassEquity separates
            participation, confidential support and financial authority.
          </p>
          <ActionLink href="/technology#boundaries" secondary>
            See the safeguards
          </ActionLink>
        </div>
        <div className="integrity-list">
          {[
            'Family support stays confidential; recipient mappings are finance-only.',
            'Parents consent to their own immutable final obligations.',
            'Provider readback verifies captures; stable identities protect against duplicates.',
            'Fees, refunds and unknown outcomes remain visible in funding.',
            'AI sees permitted aggregates and has no payment mutation authority.',
          ].map((t) => (
            <p key={t}>
              <Check size={18} />
              {t}
            </p>
          ))}
          <small>
            Hackathon implementation, not a production security or compliance certification.
          </small>
        </div>
      </section>
      <section className="final-cta public-wrap">
        <span className="eyebrow">The next adventure starts here</span>
        <h2>
          A better trip starts with
          <br />
          <em>everyone included.</em>
        </h2>
        <p>Every child belongs on the trip. Every payment is accounted for.</p>
        <div className="button-row">
          <ActionLink href="/demo">Explore the Demo</ActionLink>
          <ActionLink href="/login" secondary>
            Enter School Workspace
          </ActionLink>
        </div>
        <span className="final-flower" aria-hidden="true">
          ✳
        </span>
      </section>
      <div className="public-wrap public-disclaimer">
        <FileSearch size={16} />
        <p>
          The interactive tour runs locally in your browser. Sandbox evidence is recorded and
          redacted. The functional workspace uses separate authentication and persisted records.
        </p>
      </div>
    </PublicShell>
  );
}

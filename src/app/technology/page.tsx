import type { Metadata } from 'next';
import { PublicShell, ActionLink, SectionHeading } from '@/components/showcase/public-shell';
import {
  Wallet,
  Sparkles,
  MessageCircle,
  ChartNoAxesCombined,
  Braces,
  Database,
  Check,
  LockKeyhole,
} from 'lucide-react';
export const metadata: Metadata = {
  title: 'Technology, evidence and human authority',
  description:
    'How PayPal, Gemini, Twilio, AG Studio, APIMatic and Render fit into ClassEquity—with honest verification boundaries.',
};
const systems = [
  {
    name: 'PayPal',
    icon: Wallet,
    tag: 'Signed sandbox lifecycle verified',
    copy: 'Orders, human buyer approval, capture and refunds through the official server SDK. A separately authorized hosted $1 capture and full refund produced genuine signed approval, capture and refund callbacks. Provider readback and actual resends verified association and duplicate protection.',
    source: 'src/server/payments.ts',
    doc: 'PAYPAL_INTEGRATION.md',
  },
  {
    name: 'Gemini',
    icon: Sparkles,
    tag: 'Generation verified',
    copy: 'Vendor quotation extraction, grounded English/Hindi parent assistance and aggregate financial intelligence. Extraction needs human review; Gemini cannot authorize payments or eligibility.',
    source: 'src/server/integrations/gemini.ts',
    doc: 'ARCHITECTURE.md',
  },
  {
    name: 'Twilio',
    icon: MessageCircle,
    tag: 'Authentication verified · delivery unverified',
    copy: 'The messaging adapter, signed callbacks, opt-in pairing and secure parent links are implemented. This showcase uses local conversation illustrations, not live messages.',
    source: 'src/server/messaging.ts',
    doc: 'TWILIO_INTEGRATION.md',
  },
  {
    name: 'AG Studio / AG Grid',
    icon: ChartNoAxesCombined,
    tag: 'Real components · browser verified',
    copy: 'Editable native charts and grids, custom Group Unlock, Funding Assurance and Payment Integrity widgets. The official Agent Framework connects an authenticated Gemini adapter to aggregate report tools.',
    source: 'src/components/studio.tsx',
    doc: 'AG_STUDIO_INTEGRATION.md',
  },
  {
    name: 'APIMatic',
    icon: Braces,
    tag: 'Contract-guided development',
    copy: 'PayPal and Twilio Context Plugins informed API contracts and error/idempotency handling. The installed official PayPal SDK is APIMatic-generated. APIMatic is not a separate runtime processor or financial agent.',
    source: 'src/server/integrations/paypal.ts',
    doc: 'APIMATIC_INTEGRATION.md',
  },
  {
    name: 'Render',
    icon: Database,
    tag: process.env.RENDER_EXTERNAL_URL
      ? 'HTTPS application · PostgreSQL hosted'
      : 'PostgreSQL hosted · web deployment pending',
    copy: process.env.RENDER_EXTERNAL_URL
      ? 'The application runs over HTTPS on a free Render web service with the existing PostgreSQL ledger. Hosting and webhook registration do not prove signed event delivery; that gate is recorded separately in the verification documentation.'
      : 'The existing hosted PostgreSQL stores the application ledger. Public HTTPS deployment and genuine signed webhook delivery are separate verification gates.',
    source: 'src/db/schema.ts',
    doc: 'HOSTED_WEBHOOK_VERIFICATION.md',
  },
];
export default function Technology() {
  return (
    <PublicShell>
      <header className="public-page-title public-wrap">
        <span className="eyebrow">Built to connect. Designed to be accountable.</span>
        <h1>
          Useful intelligence.
          <br />
          <em>Clear human authority.</em>
        </h1>
        <p>
          AI helps people understand. The deterministic financial engine calculates. Authorized
          humans consent and decide. Provider evidence confirms what happened.
        </p>
      </header>
      <section className="architecture-diagram public-wrap" aria-label="ClassEquity architecture">
        <div>
          <span>People</span>
          <strong>School · parent · finance</strong>
          <small>Review, consent and authorization</small>
        </div>
        <b aria-hidden="true">→</b>
        <div className="engine-node">
          <span>ClassEquity</span>
          <strong>Deterministic financial engine</strong>
          <small>Integer cents · tenant scope · durable identities</small>
        </div>
        <b aria-hidden="true">↔</b>
        <div>
          <span>Evidence & understanding</span>
          <strong>PayPal · PostgreSQL · Gemini</strong>
          <small>Readback · durable ledger · permitted aggregates</small>
        </div>
      </section>
      <section className="public-section public-wrap">
        <SectionHeading
          eyebrow="The right job for each system"
          title="Six connections. One coherent product."
        />
        <div className="technology-grid">
          {systems.map((s) => (
            <article className="technology-card" key={s.name}>
              <s.icon size={27} strokeWidth={1.5} />
              <h3>{s.name}</h3>
              <span className="local-label">{s.tag}</span>
              <p>{s.copy}</p>
              <a
                href={`https://github.com/subodhkant7/classequity/blob/codex/hosted-webhook-verification/${s.source}`}
                target="_blank"
                rel="noreferrer"
              >
                Source: <code>{s.source}</code> ↗
              </a>
              <a
                href={`https://github.com/subodhkant7/classequity/blob/codex/hosted-webhook-verification/docs/${s.doc}`}
                target="_blank"
                rel="noreferrer"
              >
                Implementation documentation ↗
              </a>
            </article>
          ))}
        </div>
        <p className="fine-print">
          Source links require access to the private repository. Names identify the integrations; no
          endorsement or independent licensing rights are implied.
        </p>
      </section>
      <section id="boundaries" className="public-wrap boundary-panel">
        <LockKeyhole size={30} />
        <SectionHeading
          eyebrow="Evidence before claims"
          title="Clear about what is—and isn’t—verified."
        />
        <div className="boundary-grid">
          <div>
            <h3>Verified in sandbox</h3>
            <p>
              <Check size={16} />
              One $1 capture and full refund, independent readbacks and duplicate-request
              protection.
            </p>
            <p>
              <Check size={16} />
              Genuine signed approval, capture and refund callbacks, with verified event replays.
            </p>
            <p>
              <Check size={16} />
              Real AG Studio rendering, Gemini generation and contract-guided integrations.
            </p>
          </div>
          <div>
            <h3>Still to verify before release</h3>
            <p>
              Real WhatsApp delivery. Production identity, treasury controls, audit hardening and
              operational monitoring.
            </p>
          </div>
        </div>
        <p>
          The tour is synthetic and browser-local. The sandbox payment was a verification example,
          not a school contribution. ClassEquity is not escrow, a charity platform or an autonomous
          financial agent.
        </p>
      </section>
      <section className="small-cta public-wrap">
        <h2>See the connections in context.</h2>
        <ActionLink href="/demo">Explore the product</ActionLink>
      </section>
    </PublicShell>
  );
}

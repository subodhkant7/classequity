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
    tag: 'Local generation verified',
    copy: 'Hosted verification confirmed English/Hindi parent assistance (gemini-2.5-flash-lite) in the restricted sandbox. Local verification covered PDF quotation extraction and aggregate financial intelligence; hosted PDF extraction and Studio generation remain unverified. Extraction requires human review, and Gemini has no payment or eligibility authority.',
    source: 'src/server/integrations/gemini.ts',
    doc: 'ARCHITECTURE.md',
  },
  {
    name: 'Twilio',
    icon: MessageCircle,
    tag: 'Sandbox delivery verified',
    copy: 'Twilio confirmed delivery of one Sandbox message from the ClassEquity adapter. Hosted signed callbacks remain unverified. The showcase uses simulated conversations.',
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
    tag: 'HTTPS application · PostgreSQL hosted',
    copy: 'The hosted ClassEquity site runs over HTTPS on Render with PostgreSQL. The verification report records the deployed revision and the genuine signed PayPal event delivery. The local showcase uses an isolated sample database.',
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
                href={`https://github.com/subodhkant7/classequity/blob/main/${s.source}`}
                target="_blank"
                rel="noreferrer"
              >
                Source: <code>{s.source}</code> ↗
              </a>
              <a
                href={`https://github.com/subodhkant7/classequity/blob/main/docs/${s.doc}`}
                target="_blank"
                rel="noreferrer"
              >
                Implementation documentation ↗
              </a>
            </article>
          ))}
        </div>
        <p className="fine-print">
          Source code and implementation documentation are publicly available on GitHub. Names
          identify the integrations; no endorsement or independent licensing rights are implied.
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
              Hosted PDF extraction, hosted Studio AI generation, and hosted WhatsApp callbacks.
              Production identity, treasury controls, audit hardening and operational monitoring.
            </p>
          </div>
        </div>
        <p>
          The interactive tour uses browser-local sample data. The sandbox payment was a
          verification example, not a school contribution. ClassEquity is not escrow, a charity
          platform or an autonomous financial agent.
        </p>
      </section>
      <section className="small-cta public-wrap">
        <h2>See the connections in context.</h2>
        <ActionLink href="/demo">Explore the product</ActionLink>
      </section>
    </PublicShell>
  );
}

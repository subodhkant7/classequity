import type { Metadata } from 'next';
import { PublicShell, SectionHeading, ActionLink } from '@/components/showcase/public-shell';
import { PricingLab } from '@/components/showcase/pricing-lab';
import { FundingLab } from '@/components/showcase/funding-lab';
import { PaymentExplorer } from '@/components/showcase/payment-explorer';
export const metadata: Metadata = {
  title: 'How it works — pricing, participation and proof',
  description:
    'Explore deterministic group pricing, confidential support and evidence-based funding with safe local simulations.',
};
export default function How() {
  return (
    <PublicShell>
      <header className="public-page-title public-wrap">
        <span className="eyebrow">A trip has moving parts. Let’s make them clear.</span>
        <h1>
          Participation changes
          <br />
          <em>what’s possible.</em>
        </h1>
        <p>
          Move the numbers. Follow the evidence. See why registering, promising and paying are three
          different things.
        </p>
        <nav className="section-jumps" aria-label="Workflow sections">
          <a href="#pricing">01 · Group pricing</a>
          <a href="#funding">02 · Funding & support</a>
          <a href="#payment-states">03 · Payment evidence</a>
        </nav>
      </header>
      <section id="pricing" className="public-section public-wrap explainer-split">
        <SectionHeading eyebrow="01 · Plan together" title="More learners. A better group price.">
          These are the sample vendor quotation’s configured tiers. At 30 registrations, 30 × $23 =
          $690—$270 below a $32-per-seat baseline. Pricing is deterministic, not AI arithmetic. A
          school reviews and freezes the final price within parent consent.
        </SectionHeading>
        <PricingLab />
      </section>
      <section id="funding" className="public-section public-wrap">
        <SectionHeading
          eyebrow="02 · Include privately"
          title="Enough promises can still leave a gap."
        >
          Five fully assisted seats cost $115 at the $23 tier. They count as covered only when the
          actual aggregate funding supports them. Explore confirmed contributions and known costs
          without revealing a single recipient.
        </SectionHeading>
        <FundingLab />
      </section>
      <section id="payment-states" className="public-section public-wrap">
        <SectionHeading
          eyebrow="03 · Verify every payment"
          title="A request begins the story. Evidence finishes it."
        >
          The state viewer is a local illustration. The separately labeled $1 record is an actual,
          completed PayPal sandbox verification—not a payment you are creating here.
        </SectionHeading>
        <PaymentExplorer />
      </section>
      <section className="small-cta public-wrap">
        <h2>Ready to see it all come together?</h2>
        <ActionLink href="/demo">Take the guided tour</ActionLink>
      </section>
    </PublicShell>
  );
}

import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  HeartHandshake,
  ShieldCheck,
  Users,
  MessageCircle,
  ChartNoAxesCombined,
  Sparkles,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import Museum from '@/components/museum';
export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <nav>
          <a href="#how-it-works">How it works</a>
          <a href="#belonging">Built for belonging</a>
          <Link href="/login" className="btn ghost">
            School login <ArrowUpRight size={14} />
          </Link>
          <Link href="/login?demo=1" className="btn primary">
            Explore the demo <ArrowRight size={14} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div>
            <div className="badge green">
              <Sparkles size={12} /> Small contributions. Shared possibilities.
            </div>
            <h1>
              Every child
              <br />
              belongs on
              <br />
              <em>the adventure.</em>
            </h1>
            <p>
              Bring your whole class along. Plan school trips, unlock better group prices, and make
              room for every family—with kindness and clarity.
            </p>
            <div className="page-actions">
              <Link href="/login?demo=1" className="btn primary">
                Step inside ClassEquity <ArrowRight size={15} />
              </Link>
              <a href="#how-it-works" className="btn secondary">
                See how it works
              </a>
            </div>
            <p
              style={{ fontSize: 10, marginTop: 20, display: 'flex', gap: 7, alignItems: 'center' }}
            >
              <ShieldCheck size={14} /> Confidential support. Accountable payments. USD sandbox
              demo.
            </p>
          </div>
          <div className="landing-hero-art">
            <Museum />
            <div className="float-note one">
              <span className="feature-symbol">
                <Users size={22} />
              </span>
              <div>
                <strong>30 students. One shared adventure.</strong>
                <small>Group price unlocked · $23 per seat</small>
              </div>
            </div>
            <div className="float-note two">
              <span style={{ color: '#719553' }}>
                <HeartHandshake size={24} />
              </span>
              <div>
                <strong>Belonging comes first.</strong>
                <small>Confidential, school-approved support</small>
              </div>
            </div>
          </div>
        </section>
        <div className="landing-trust">
          <small>BUILT WITH</small>
          <span>PayPal</span>
          <span>AG Studio</span>
          <span>Gemini</span>
          <span>Twilio</span>
          <span>APIMatic</span>
        </div>
        <section id="how-it-works" className="landing-section">
          <div className="eyebrow muted">Less administration. More discovery.</div>
          <h2>
            A great trip starts with
            <br />
            everyone on the same page.
          </h2>
          <div className="feature-grid">
            {[
              {
                icon: Users,
                title: 'A bigger group. A better price.',
                text: 'Set transparent pricing tiers. As families register, everyone can see the next group discount. Freeze the final price with parent consent.',
              },
              {
                icon: HeartHandshake,
                title: 'Support that stays personal.',
                text: 'Families can ask for help privately. School finance teams approve assistance, while sponsors see only their contribution and aggregate progress.',
              },
              {
                icon: ShieldCheck,
                title: 'Every payment accounted for.',
                text: 'PayPal checkout, capture readback, and exact-cent reconciliation keep commitments distinct from confirmed funds. Fees and shortfalls stay visible.',
              },
            ].map((f) => (
              <div className="card" key={f.title}>
                <div className="feature-symbol">
                  <f.icon />
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="belonging" className="landing-section" style={{ paddingTop: 0 }}>
          <div className="feature-grid">
            <div className="card">
              <MessageCircle color="#638851" />
              <h3>Meet families where they are.</h3>
              <p>
                English and Hindi trip information through WhatsApp. Secure links bring registration
                and payment consent back to the parent portal.
              </p>
            </div>
            <div className="card">
              <ChartNoAxesCombined color="#638851" />
              <h3>Clarity for the whole school.</h3>
              <p>
                Editable AG Studio reports show group progress, verified funding, and payment
                integrity. Ask Gemini to explain the aggregate numbers.
              </p>
            </div>
            <div className="card">
              <Check color="#638851" />
              <h3>Built to tell the truth.</h3>
              <p>
                Explore fictional families and clearly labeled provider simulations. Sandbox
                checkout is separate and always requires human buyer approval.
              </p>
            </div>
          </div>
        </section>
        <section className="landing-section" style={{ paddingTop: 0 }}>
          <div className="landing-cta">
            <div>
              <h2>
                Little adventures.
                <br />A lasting sense of belonging.
              </h2>
              <p>Every child belongs on the trip. Every payment is accounted for.</p>
            </div>
            <Link className="btn" href="/login?demo=1">
              Explore the school workspace <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <span>PayPal AI Hackathon 2026 · Fictional school demonstration</span>
        <span>Made for shared possibilities.</span>
      </footer>
    </div>
  );
}

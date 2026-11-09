'use client';
import { useHydrated } from '../use-hydrated';
import { useState } from 'react';
import { FileSearch, MessageCircle, ChartNoAxesCombined, ArrowUpRight, Check } from 'lucide-react';
import Link from 'next/link';
const workflows = [
  {
    title: 'A quotation becomes a plan',
    icon: FileSearch,
    tag: 'Document intelligence',
    text: 'Gemini extracts structured tiers, dates and conditions. An administrator reviews the source before activating a price.',
    route: '/demo?chapter=quotation',
  },
  {
    title: 'A question finds its answer',
    icon: MessageCircle,
    tag: 'Parent assistance',
    text: 'English or Hindi, grounded in approved trip information. No eligibility decisions. No new payment instructions.',
    route: '/demo?chapter=families',
  },
  {
    title: 'The numbers tell their story',
    icon: ChartNoAxesCombined,
    tag: 'Financial intelligence',
    text: 'Gemini reads permitted aggregates and shapes an editable AG Studio report. The financial engine and human authority stay separate.',
    route: '/demo?chapter=intelligence',
  },
];
export function RecordedAI() {
  const hydrated = useHydrated();
  const [active, setActive] = useState(0);
  return (
    <div className="ai-workflows">
      <div className="ai-options" role="tablist" aria-label="AI workflows">
        {workflows.map((w, i) => (
          <button
            key={w.tag}
            id={`ai-tab-${i}`}
            role="tab"
            disabled={!hydrated}
            aria-selected={active === i}
            aria-controls="ai-workflow-panel"
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
                e.preventDefault();
                const n = (active + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 2)) % 3;
                setActive(n);
                document.getElementById(`ai-tab-${n}`)?.focus();
              }
            }}
          >
            <w.icon size={23} />
            <span>
              <small>{w.tag}</small>
              <strong>{w.title}</strong>
            </span>
            <ArrowUpRight size={18} />
          </button>
        ))}
      </div>
      <div
        id="ai-workflow-panel"
        role="tabpanel"
        aria-labelledby={`ai-tab-${active}`}
        className="ai-result"
      >
        <span className="local-label">Workflow illustration · no API request</span>
        {active === 0 ? (
          <div className="extraction-preview">
            <FileSearch size={30} />
            <h3>Quotation → structured pricing</h3>
            <div className="extracted-line">
              <span>1–19 students</span>
              <strong>$32.00</strong>
              <Check size={14} />
            </div>
            <div className="extracted-line">
              <span>20–29 students</span>
              <strong>$27.00</strong>
              <Check size={14} />
            </div>
            <div className="extracted-line">
              <span>30+ students</span>
              <strong>$23.00</strong>
              <Check size={14} />
            </div>
            <p className="fine-print">
              Recorded Gemini extraction from our fictional quotation. Source review required.
            </p>
          </div>
        ) : active === 1 ? (
          <div className="chat-illustration">
            <p className="chat-bubble question" lang="hi">
              यात्रा की कीमत कितनी है?
            </p>
            <p className="chat-bubble answer typing" lang="hi">
              30 विद्यार्थियों के समूह के लिए अनुमानित कीमत $23 प्रति विद्यार्थी है। अंतिम कीमत
              स्कूल की पुष्टि के बाद तय होगी।
            </p>
            <p className="fine-print">
              Illustrative Hindi answer based on configured tiers. The real authenticated assistant
              uses Gemini.
            </p>
          </div>
        ) : (
          <div className="analytics-illustration">
            <span>“Why is the trip still underfunded?”</span>
            <div
              className="mini-bars"
              aria-label="Required 690 dollars, net 532 dollars and 30 cents"
            >
              <i style={{ height: '100%' }} />
              <i style={{ height: '77%' }} />
              <i style={{ height: '23%' }} />
            </div>
            <div className="spread">
              <b>$690 required</b>
              <b>$157.70 gap</b>
            </div>
            <p className="fine-print">
              Deterministic ledger values. Gemini explains the aggregates; AG Studio renders the
              report.
            </p>
          </div>
        )}
        <p>{workflows[active].text}</p>
        <Link className="text-button" href={workflows[active].route}>
          Explore this workflow <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  );
}

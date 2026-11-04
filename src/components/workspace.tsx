'use client';
import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Users,
  Wallet,
  HeartHandshake,
  Compass,
  Download,
  CalendarDays,
  MapPin,
  LockKeyhole,
  Sparkles,
  ShieldCheck,
  Check,
  Clock,
  RefreshCw,
  FileText,
  Send,
  MessageCircle,
  LoaderCircle,
  AlertTriangle,
  Settings,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';
import type { Actor } from '@/server/auth';
import type { dashboardData, financeData, safeRegistrations } from '@/server/data';
import { money, type Tier, quoteSchema } from '@/lib/domain';
import { Badge, Button, Empty, Field, Modal, Notice, api } from './ui';
import Museum from './museum';
const Studio = dynamic(() => import('./studio'), {
  ssr: false,
  loading: () => (
    <div className="loading">
      <LoaderCircle size={21} />
      Loading AG Studio financial intelligence…
    </div>
  ),
});
type Overview = Awaited<ReturnType<typeof dashboardData>>;
type Trip = Overview[number];
type Finance = Awaited<ReturnType<typeof financeData>>;
type Reg = Awaited<ReturnType<typeof safeRegistrations>>;
const statusTone = (s: string) =>
  s === 'COMPLETED'
    ? 'green'
    : s === 'FAILED'
      ? 'red'
      : ['UNKNOWN', 'PENDING', 'REFUND_PENDING'].includes(s)
        ? 'amber'
        : 'neutral';
const readable = (s: string) =>
  s
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (c) => c.toUpperCase());
function Metric({
  label,
  value,
  foot,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  foot: string;
  icon: typeof Users;
  color?: string;
}) {
  return (
    <div className="metric">
      <div className="metric-top">
        {label}
        <span className="metric-icon" style={color ? { background: color } : undefined}>
          <Icon size={15} />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">{foot}</div>
    </div>
  );
}
function FundingCard({ d }: { d: Trip }) {
  const percent = d.totals.required
    ? Math.min(100, Math.round((d.totals.net / d.totals.required) * 100))
    : 0;
  return (
    <div className="card funding-card">
      <div className="section-heading">
        <h2>Funding assurance</h2>
        <ShieldCheck size={18} color="#6c8454" />
      </div>
      <div className="ring" style={{ '--pct': `${percent}%` } as CSSProperties}>
        <div className="ring-content">
          <strong>{percent}%</strong>
          <small>of trip cost funded, net</small>
        </div>
      </div>
      <div className="funding-rows">
        <div>
          <span>Confirmed captures</span>
          <strong>{money(d.totals.gross)}</strong>
        </div>
        <div>
          <span>Processing fees</span>
          <span>− {money(d.totals.fees)}</span>
        </div>
        {d.totals.refunds > 0 && (
          <div>
            <span>Refunds</span>
            <span>− {money(d.totals.refunds)}</span>
          </div>
        )}
        {d.trip.reserveCents > 0 && (
          <div>
            <span>School reserve · simulated</span>
            <span>+ {money(d.trip.reserveCents)}</span>
          </div>
        )}
        <div>
          <span>Net funds available</span>
          <strong>{money(d.totals.net)}</strong>
        </div>
      </div>
      <div className="funding-note">
        {d.totals.ready ? (
          <>
            <Check size={13} style={{ display: 'inline', marginRight: 5 }} />
            This scenario is fully funded, including fees.{' '}
            {d.payments[0]?.mode === 'demo' ? 'All money is simulated.' : ''}
          </>
        ) : (
          <>
            <strong>{money(d.totals.gap)} still to go.</strong> {d.totals.unresolved} payment
            operations need a final outcome. A commitment counts only after capture.
          </>
        )}
      </div>
    </div>
  );
}
function TripCard({ d }: { d: Trip }) {
  return (
    <div className="card trip-feature">
      <div className="trip-visual">
        <Museum />
        <div className="trip-visual-copy">
          <Badge tone="green">SCIENCE & DISCOVERY</Badge>
          <h2>{d.trip.name}</h2>
          <p>
            <MapPin size={11} style={{ display: 'inline', marginRight: 4 }} />
            {d.trip.destination}
          </p>
        </div>
      </div>
      <div className="trip-body">
        <div className="trip-meta">
          <div>
            <small>DEPARTURE</small>
            <CalendarDays size={12} style={{ display: 'inline', marginRight: 6 }} />
            {new Date(`${d.trip.date}T12:00:00`).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          <div>
            <small>REGISTERED</small>
            {d.registrationCount} / {d.trip.capacity} students
          </div>
          <div>
            <small>GROUP PRICE</small>
            {money(d.seatCents)} per student
          </div>
          <div>
            <small>STATUS</small>
            <Badge tone={d.snapshot ? 'green' : 'amber'}>
              {d.snapshot ? 'Price finalized' : 'Registration open'}
            </Badge>
          </div>
        </div>
        <div className="spread" style={{ fontSize: 11, marginBottom: 10 }}>
          <strong>
            {d.registrationCount >= 30
              ? 'Best group price unlocked'
              : 'Every registration brings us closer'}
          </strong>
          <span className="muted">{d.registrationCount} students</span>
        </div>
        <div className="progress">
          <span style={{ width: `${Math.min(100, (d.registrationCount / 30) * 100)}%` }} />
        </div>
        <div className="price-tiers">
          {[...d.trip.tiers]
            .sort((a, b) => a.min - b.min)
            .map((t, i, all) => (
              <div className={`price-tier ${d.seatCents === t.cents ? 'current' : ''}`} key={t.min}>
                {t.min}
                {all[i + 1] ? `–${all[i + 1].min - 1}` : '+'} students
                <strong>{money(t.cents)}</strong>
                <small>{d.seatCents === t.cents ? '✓ CURRENT TIER' : 'PER STUDENT'}</small>
              </div>
            ))}
        </div>
      </div>
      <div className="card-footer">
        <span>
          <LockKeyhole size={11} style={{ display: 'inline', marginRight: 5 }} />
          {d.snapshot
            ? 'Final price protected by parent consent'
            : 'Prices remain estimates until finalization'}
        </span>
        <Link href={`/trips/${d.trip.id}`}>
          View trip <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}
function Chat({ a, tripId, simulator = false }: { a: Actor; tripId: string; simulator?: boolean }) {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: simulator
        ? 'Hello! This is the WhatsApp simulator. Ask about the museum trip, group pricing, the deadline, or a secure registration link.'
        : 'Hi! Ask me about your trip, pricing, or deadlines. I use school-approved information.',
      source: simulator ? 'SIMULATED · no WhatsApp message sent' : 'School-grounded assistant',
    },
  ]);
  const submit = async (value = text) => {
    if (!value.trim() || busy) return;
    setText('');
    setMessages((m) => [...m, { role: 'user', text: value, source: '' }]);
    setBusy(true);
    try {
      const reply = await api<{ text: string; source: string }>(
        simulator ? 'messages/simulate' : 'assistant',
        simulator ? { tripId, text: value, language } : { tripId, message: value, language },
      );
      setMessages((m) => [...m, { role: 'assistant', ...reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: (e as Error).message, source: 'Request unavailable' },
      ]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack">
      <div className="spread">
        <div className="flex">
          <Badge tone={simulator ? 'amber' : 'purple'}>
            {simulator ? 'Provider simulation' : 'Gemini + grounded fallback'}
          </Badge>
        </div>
        <select
          aria-label="Assistant language"
          style={{ width: 110 }}
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
        >
          <option value="en">English</option>
          <option value="hi">हिन्दी</option>
        </select>
      </div>
      <div className="chat">
        <div className="chat-header">
          <MessageCircle size={25} />
          <div>
            <h3>Oakwood trip assistant</h3>
            <p>
              {simulator
                ? 'WhatsApp simulator · synthetic families'
                : `${a.name} · Your school’s approved information`}
            </p>
          </div>
        </div>
        <div className="chat-messages" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === 'user' ? 'user' : ''}`}>
              <span style={{ whiteSpace: 'pre-wrap' }}>{m.text}</span>
              {m.source && <small>{m.source}</small>}
            </div>
          ))}
          {busy && (
            <div className="bubble">
              <LoaderCircle className="spin" size={16} /> Thinking…
            </div>
          )}
        </div>
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <input
            aria-label="Message to trip assistant"
            placeholder={language === 'en' ? 'Ask about the trip…' : 'यात्रा के बारे में पूछें…'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
          />
          <Button type="submit" disabled={busy || !text.trim()}>
            <Send size={16} />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </div>
      <div className="flex" style={{ flexWrap: 'wrap' }}>
        {['What is the group price?', 'When is payment due?', 'Get a secure link'].map((p) => (
          <button
            key={p}
            className="btn secondary"
            style={{ fontSize: 10, minHeight: 32, padding: '7px 10px' }}
            onClick={() => void submit(p)}
            disabled={busy}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
export { Chat };
function TripEditor({
  d,
  onSaved,
  onClose,
}: {
  d?: Trip;
  onSaved: (id: string) => void;
  onClose: () => void;
}) {
  const [tiers, setTiers] = useState<Tier[]>(
    d?.trip.tiers ?? [
      { min: 1, cents: 3200 },
      { min: 20, cents: 2700 },
      { min: 30, cents: 2300 },
    ],
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={d ? 'Edit activity' : 'Plan a new adventure'} onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const f = new FormData(e.currentTarget);
          try {
            const result = await api<{ id?: string }>(d ? `trips/${d.trip.id}` : 'trips', {
              name: f.get('name'),
              destination: f.get('destination'),
              description: f.get('description'),
              date: f.get('date'),
              deadline: f.get('deadline'),
              capacity: Number(f.get('capacity')),
              tiers,
            });
            onSaved(result.id || d!.trip.id);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>Transparent group pricing, clear deadlines, and a place for everyone.</p>
        <div className="form-grid">
          <Field label="Activity name">
            <input
              name="name"
              defaultValue={d?.trip.name}
              placeholder="A day of discovery"
              required
              minLength={3}
              maxLength={120}
            />
          </Field>
          <Field label="Destination">
            <input
              name="destination"
              defaultValue={d?.trip.destination}
              placeholder="Science museum"
              required
              minLength={3}
            />
          </Field>
          <div className="wide">
            <Field label="Approved parent information">
              <textarea
                name="description"
                defaultValue={d?.trip.description}
                placeholder="What is included, departure times, and what to bring…"
                required
                minLength={10}
              />
            </Field>
          </div>
          <Field label="Departure date">
            <input type="date" name="date" defaultValue={d?.trip.date ?? '2026-11-20'} required />
          </Field>
          <Field label="Registration & payment deadline">
            <input
              type="date"
              name="deadline"
              defaultValue={d?.trip.deadline ?? '2026-11-15'}
              required
            />
          </Field>
          <Field label="Student capacity">
            <input
              type="number"
              name="capacity"
              min={1}
              max={500}
              defaultValue={d?.trip.capacity ?? 40}
              required
            />
          </Field>
          <Field label="Currency">
            <input value="USD · integer cents" readOnly />
          </Field>
        </div>
        <div className="section-heading" style={{ marginBottom: 0 }}>
          <h3>Group pricing tiers</h3>
          <Button
            variant="ghost"
            onClick={() =>
              setTiers((t) => [
                ...t,
                { min: (t.at(-1)?.min ?? 0) + 10, cents: t.at(-1)?.cents ?? 2300 },
              ])
            }
          >
            <Plus size={14} />
            Add tier
          </Button>
        </div>
        {tiers.map((t, i) => (
          <div className="flex" key={i}>
            <Field label="From students">
              <input
                aria-label={`Tier ${i + 1} minimum students`}
                type="number"
                min={1}
                value={t.min}
                onChange={(e) =>
                  setTiers((all) =>
                    all.map((v, n) => (n === i ? { ...v, min: Number(e.target.value) } : v)),
                  )
                }
                required
              />
            </Field>
            <Field label="Seat price (USD cents)">
              <input
                aria-label={`Tier ${i + 1} price in cents`}
                type="number"
                min={1}
                value={t.cents}
                onChange={(e) =>
                  setTiers((all) =>
                    all.map((v, n) => (n === i ? { ...v, cents: Number(e.target.value) } : v)),
                  )
                }
                required
              />
            </Field>
            {tiers.length > 1 && (
              <Button
                variant="ghost"
                onClick={() => setTiers((all) => all.filter((_, n) => n !== i))}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        {error && <Notice error>{error}</Notice>}
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : d ? 'Save activity' : 'Create activity'}
          <ArrowRight size={15} />
        </Button>
      </form>
    </Modal>
  );
}
function Quotations({
  tripId,
  frozen,
  onChange,
}: {
  tripId: string;
  frozen: boolean;
  onChange: () => void;
}) {
  const [error, setError] = useState('');
  const [extraction, setExtraction] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [source, setSource] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  return (
    <section className="card stack">
      <div className="section-heading" style={{ margin: 0 }}>
        <div>
          <h2>Vendor document intelligence</h2>
          <p>Extract a quote with Gemini. A person reviews every pricing rule.</p>
        </div>
        <FileText size={23} />
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        Upload a USD vendor quotation, up to 6 MB. Only vendor data belongs here. Keep student and
        hardship records out of uploads.
      </p>
      <input
        aria-label="Vendor quotation file"
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        disabled={frozen || busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError('');
          const form = new FormData();
          form.set('file', file);
          try {
            const response = await fetch(`/api/trips/${tripId}/quotations`, {
              method: 'POST',
              body: form,
            });
            const result = await response.json();
            if (!response.ok) throw Error(result.error);
            setExtraction(JSON.stringify(result.extraction, null, 2));
            setQuoteId(result.id);
            setSource('Gemini extraction · review required');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      {busy && (
        <p className="flex muted">
          <LoaderCircle size={16} className="spin" />
          Reading the quote…
        </p>
      )}
      {frozen && <p className="muted">Final pricing is frozen. A quote cannot overwrite it.</p>}
      {extraction && (
        <>
          <Badge tone="purple">{source}</Badge>
          <Field label="Review and correct the extracted quotation JSON">
            <textarea
              className="quote-json"
              value={extraction}
              onChange={(e) => setExtraction(e.target.value)}
            />
          </Field>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I checked the source quote, prices in cents, thresholds, conditions, and uncertainties.
          </label>
          <Button
            disabled={!reviewed || frozen}
            onClick={async () => {
              setError('');
              try {
                const parsed = quoteSchema.parse(JSON.parse(extraction));
                await api(`trips/${tripId}/approve-quote`, {
                  id: quoteId,
                  extraction: parsed,
                  reviewed: true,
                });
                setNotice('Reviewed pricing tiers activated.');
                onChange();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Approve and activate pricing <Check size={14} />
          </Button>
        </>
      )}
      {notice && <Notice>{notice}</Notice>}
      {error && <Notice error>{error}</Notice>}
    </section>
  );
}
export default function Workspace({
  a,
  view,
  tripId,
  studioLicense,
}: {
  a: Actor;
  view: string;
  tripId?: string;
  studioLicense?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<Overview>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<'new' | 'edit' | null>(null);
  const [selected, setSelected] = useState(tripId || '');
  const [regs, setRegs] = useState<Reg>([]);
  const [finance, setFinance] = useState<Finance | null>(null);
  const [search, setSearch] = useState('');
  const [invitation, setInvitation] = useState('');
  const [integration, setIntegration] = useState<Record<
    string,
    {
      configured?: boolean;
      webhook?: boolean;
      publicHttps?: boolean;
      driver?: string;
      version?: string;
    }
  > | null>(null);
  const [schoolList, setSchoolList] = useState<{ id: string; name: string; role: string }[]>([]);
  const [newSchool, setNewSchool] = useState('');
  const [schoolName, setSchoolName] = useState('Oakwood Academy');
  const [conversations, setConversations] = useState<
    { id: string; phone: string; optedIn: boolean; lastInboundAt: string | null }[]
  >([]);
  const [audit, setAudit] = useState<
    { id: string; action: string; entityId: string; createdAt: string }[]
  >([]);
  const d = data.find((d) => d.trip.id === selected) ?? data[0];
  const manage = a.role === 'admin' || a.role === 'finance';
  const refresh = useCallback(async () => {
    try {
      const rows = await api<Overview>('dashboard');
      setData(rows);
      if (!selected && rows[0]) setSelected(rows[0].trip.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selected]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const extra = useCallback(async () => {
    try {
      if (view === 'settings') {
        setIntegration(await api('integrations'));
        const list = await api<{ id: string; name: string; role: string }[]>('schools');
        setSchoolList(list);
        const current = list.find((s) => s.id === a.schoolId);
        if (current) setSchoolName(current.name);
      }
      if (!d) return;
      if (view === 'registrations' || view === 'trip')
        setRegs(await api<Reg>(`trips/${d.trip.id}/registrations`));
      if (view === 'finance' && a.role === 'finance') {
        setFinance(await api<Finance>(`trips/${d.trip.id}/finance`));
        setAudit(await api('audit'));
      }
      if (view === 'messages' && a.role !== 'teacher') setConversations(await api('messages'));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [d, view, a.role, a.schoolId]);
  useEffect(() => {
    void extra();
  }, [extra]);
  const run = async (fn: () => Promise<unknown>, message: string) => {
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(message);
      await refresh();
      await extra();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const title: Record<string, string> = {
    dashboard: 'A little planning. A lot of possibility.',
    trips: 'Make room for the next adventure.',
    registrations: 'Every registration is a new possibility.',
    sponsorship: 'A community that makes room.',
    analytics: 'Financial intelligence, with clarity.',
    messages: 'Keep every family in the loop.',
    finance: 'Every cent. Every outcome.',
    settings: 'Your school, connected.',
    trip: d?.trip.name || 'School activity',
  };
  if (loading)
    return (
      <div className="loading">
        <LoaderCircle size={20} />
        Opening your school workspace…
      </div>
    );
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow muted" style={{ marginBottom: 11 }}>
            {view === 'dashboard'
              ? `WELCOME BACK, ${a.name.split(' ')[0]}`
              : view === 'finance'
                ? 'RESTRICTED FINANCE WORKSPACE'
                : 'OAKWOOD ACADEMY · CLASS EQUITY'}
          </div>
          <h1>{title[view] || 'Your school workspace'}</h1>
          <p>
            {view === 'dashboard'
              ? 'Here’s how your school’s next shared adventure is coming together.'
              : view === 'analytics'
                ? 'Explore the numbers. Shape your reports. Keep student support confidential.'
                : 'Thoughtful coordination for the whole school community.'}
          </p>
        </div>
        <div className="page-actions">
          {['dashboard', 'analytics', 'finance'].includes(view) && (
            <a
              href="/api/export"
              download="classequity-reconciliation.csv"
              className="btn secondary"
            >
              <Download size={14} />
              Export report
            </a>
          )}
          {manage && ['dashboard', 'trips'].includes(view) && (
            <Button onClick={() => setEditor('new')}>
              <Plus size={16} />
              Create a trip
            </Button>
          )}
          {view === 'trip' && manage && d && !d.snapshot && (
            <Button variant="secondary" onClick={() => setEditor('edit')}>
              <Settings size={14} />
              Edit activity
            </Button>
          )}
        </div>
      </div>
      {error && <Notice error>{error}</Notice>}
      {notice && <Notice>{notice}</Notice>}
      {invitation && (
        <Notice>
          Single-use parent invitation (30 minutes):{' '}
          <a className="link" href={invitation}>
            {invitation}
          </a>
        </Notice>
      )}
      {data.length > 1 && (
        <div style={{ marginBottom: 22, maxWidth: 350 }}>
          <Field label="Selected activity">
            <select value={d?.trip.id} onChange={(e) => setSelected(e.target.value)}>
              {data.map((t) => (
                <option key={t.trip.id} value={t.trip.id}>
                  {t.trip.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      {!d && (
        <div className="card">
          <Empty
            title="Your first adventure starts here."
            description="Create a trip with group pricing, a clear deadline, and space for every student."
            action={
              manage && (
                <Button onClick={() => setEditor('new')}>
                  Create your first trip <Plus size={15} />
                </Button>
              )
            }
          />
        </div>
      )}
      {d && view === 'dashboard' && (
        <>
          <div className="metrics">
            <Metric
              label="Upcoming activities"
              value={String(data.length)}
              foot="One shared calendar. More discovery."
              icon={Compass}
            />
            <Metric
              label="Students registered"
              value={String(d.registrationCount)}
              foot={`${d.confirmedSeats} seats have a completed payment`}
              icon={Users}
              color="#eeedf9"
            />
            <Metric
              label="Net trip funding"
              value={money(d.totals.net)}
              foot={`${money(d.totals.required)} needed, including all seats`}
              icon={Wallet}
              color="#f8edda"
            />
            <Metric
              label="Sponsor commitments"
              value={money(d.totals.sponsorCommitted)}
              foot="Voluntary pledges · capture required"
              icon={HeartHandshake}
              color="#f4e9ec"
            />
          </div>
          <div className="dashboard-grid">
            <div className="stack">
              <div className="section-heading" style={{ marginBottom: 0 }}>
                <h2>
                  Your next adventure{' '}
                  <span className="muted" style={{ fontSize: 11, fontWeight: 400, marginLeft: 7 }}>
                    01
                  </span>
                </h2>
                <Link href="/trips" className="flex muted" style={{ fontSize: 11 }}>
                  All trips <ArrowUpRight size={13} />
                </Link>
              </div>
              <TripCard d={d} />
              <div className="card table-card">
                <div className="section-heading">
                  <div>
                    <h2>Payment pulse</h2>
                    <p>Independent operations. Verified outcomes.</p>
                  </div>
                  <Badge tone="amber">{d.totals.unresolved} need attention</Badge>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Operation</th>
                        <th>Provider</th>
                        <th>Payment status</th>
                        <th>Data source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...d.payments]
                        .sort(
                          (x, y) =>
                            Number(['COMPLETED'].includes(x.status)) -
                            Number(['COMPLETED'].includes(y.status)),
                        )
                        .slice(0, 4)
                        .map((p, i) => (
                          <tr key={p.id}>
                            <td>
                              <div className="table-user">
                                <span className="avatar">{String(i + 1).padStart(2, '0')}</span>
                                <strong>Payment operation {String(i + 1).padStart(2, '0')}</strong>
                              </div>
                            </td>
                            <td>PayPal {p.mode === 'demo' ? 'simulator' : 'Sandbox'}</td>
                            <td>
                              <Badge tone={statusTone(p.status)}>{readable(p.status)}</Badge>
                            </td>
                            <td className="muted">
                              {p.mode === 'demo' ? 'Synthetic example' : 'Provider readback'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="stack">
              <div className="section-heading" style={{ marginBottom: 0 }}>
                <h2>Financial readiness</h2>
                <Badge tone={d.totals.ready ? 'green' : 'amber'}>
                  {d.totals.ready ? 'Ready' : 'In progress'}
                </Badge>
              </div>
              <FundingCard d={d} />
              <div className="card">
                <div className="section-heading" style={{ marginBottom: 7 }}>
                  <h2>On the horizon</h2>
                  <CalendarDays size={17} className="muted" />
                </div>
                {[
                  {
                    icon: Users,
                    title: `${d.registrationCount} students registered`,
                    desc: 'Registration and consent recorded',
                    time: 'Cohort progress',
                  },
                  {
                    icon: LockKeyhole,
                    title: d.snapshot ? 'Group price finalized' : 'Group price is an estimate',
                    desc: `${money(d.seatCents)} per student · ${d.snapshot ? 'immutable snapshot' : 'awaiting school confirmation'}`,
                    time: 'Pricing checkpoint',
                  },
                  {
                    icon: Clock,
                    title: 'Family payment deadline',
                    desc: new Date(`${d.trip.deadline}T12:00:00`).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                    }),
                    time: 'Next milestone',
                  },
                ].map((x) => (
                  <div className="activity-item" key={x.title}>
                    <span className="activity-icon">
                      <x.icon size={15} />
                    </span>
                    <div>
                      <strong>{x.title}</strong>
                      <p>{x.desc}</p>
                      <small>{x.time}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="ai-banner">
            <span className="ai-spark">
              <Sparkles size={21} />
            </span>
            <div>
              <h3>A clearer picture, one question away.</h3>
              <p>
                Ask your financial assistant about funding gaps, group prices, and what needs
                attention.
              </p>
            </div>
            <Link href="/analytics" className="btn">
              Open financial intelligence <ArrowUpRight size={14} />
            </Link>
          </div>
        </>
      )}
      {d && view === 'trips' && (
        <div className="dashboard-grid">
          {data.map((d) => (
            <TripCard key={d.trip.id} d={d} />
          ))}
        </div>
      )}
      {d && view === 'trip' && (
        <>
          <Link href="/trips" className="flex muted" style={{ fontSize: 11, marginBottom: 20 }}>
            <ChevronLeft size={14} />
            All school trips
          </Link>
          <div className="split">
            <div className="stack">
              <TripCard d={d} />
              <section className="card stack">
                <h2>Approved trip information</h2>
                <p className="muted" style={{ fontSize: 12 }}>
                  {d.trip.description}
                </p>
                <div className="form-grid">
                  <div className="mini-stat">
                    <strong>{d.registrationCount}</strong>
                    <small>Registered students</small>
                  </div>
                  <div className="mini-stat">
                    <strong>{d.confirmedSeats}</strong>
                    <small>Seats with a completed payment</small>
                  </div>
                </div>
                <h3>Registration is a commitment to participate.</h3>
                <p className="muted" style={{ fontSize: 11 }}>
                  A registration is not a payment. The school freezes the final group price only
                  after checking recorded parent consent. A later cancellation never silently
                  increases another family’s approved obligation.
                </p>
                {manage && (
                  <div className="flex" style={{ flexWrap: 'wrap' }}>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        run(
                          async () =>
                            setInvitation(
                              (await api<{ url: string }>(`trips/${d.trip.id}/invite`, {})).url,
                            ),
                          'Invitation created. Share it privately with one family.',
                        )
                      }
                    >
                      <Users size={14} />
                      Create parent invitation
                    </Button>
                    {!d.snapshot && (
                      <Button
                        onClick={() =>
                          run(
                            () => api(`trips/${d.trip.id}/freeze`, {}),
                            'Final price frozen. Immutable family obligations created.',
                          )
                        }
                      >
                        <LockKeyhole size={14} />
                        Freeze final group price
                      </Button>
                    )}
                  </div>
                )}
              </section>
              {manage && (
                <Quotations
                  tripId={d.trip.id}
                  frozen={!!d.snapshot}
                  onChange={() => void refresh()}
                />
              )}
            </div>
            <div className="stack">
              <FundingCard d={d} />
              <div className="privacy-card">
                <ShieldCheck size={22} />
                <h3 style={{ marginTop: 12 }}>Private support. Shared opportunity.</h3>
                <p>
                  Teachers and school coordinators see permitted aggregate funding statistics. Only
                  finance personnel can inspect individual assistance allocations.
                </p>
              </div>
              <div className="card">
                <h2>Registration list</h2>
                <p className="muted" style={{ fontSize: 11, margin: '12px 0 18px' }}>
                  {regs.length} fictional students. No hardship information is included.
                </p>
                <Link href="/registrations" className="btn secondary">
                  View registrations <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
      {d && view === 'registrations' && (
        <section className="card table-card">
          <div className="section-heading">
            <div>
              <h2>
                Ready for discovery <Badge tone="green">{regs.length} registered</Badge>
              </h2>
              <p>{d.trip.name} · Synthetic student identities only</p>
            </div>
            <div style={{ maxWidth: 240 }}>
              <input
                aria-label="Search registrations"
                placeholder="Search students…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Activity</th>
                  <th>Registration</th>
                  <th>Privacy</th>
                  {manage && <th>Parent access</th>}
                </tr>
              </thead>
              <tbody>
                {regs
                  .filter((r) => r.student.toLowerCase().includes(search.toLowerCase()))
                  .map((r, i) => (
                    <tr key={r.id}>
                      <td>
                        <div className="table-user">
                          <span
                            className="avatar"
                            style={{ background: i % 2 ? '#e6eddf' : '#eee8dc' }}
                          >
                            {r.student
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </span>
                          <strong>{r.student}</strong>
                        </div>
                      </td>
                      <td>{d.trip.name}</td>
                      <td>
                        <Badge tone="green">Registered</Badge>
                      </td>
                      <td className="muted">
                        <ShieldCheck size={12} style={{ display: 'inline', marginRight: 5 }} />
                        Support details restricted
                      </td>
                      {manage && (
                        <td>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              run(
                                async () =>
                                  setInvitation(
                                    (
                                      await api<{ url: string }>(`trips/${d.trip.id}/invite`, {
                                        registrationId: r.id,
                                      })
                                    ).url,
                                  ),
                                'One-use family portal link created. Share privately with the named family.',
                              )
                            }
                          >
                            Create portal link <ArrowUpRight size={12} />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {regs.length === 0 && (
            <Empty
              title="A whole adventure ahead."
              description="Create a secure invitation from the activity page to welcome your first family."
            />
          )}
        </section>
      )}
      {d && view === 'sponsorship' && (
        <>
          <div className="metrics">
            <Metric
              label="Voluntary commitments"
              value={money(d.totals.sponsorCommitted)}
              foot="Pledges are distinct from captured funds"
              icon={HeartHandshake}
            />
            <Metric
              label="Trip funding requirement"
              value={money(d.totals.required)}
              foot={`${d.snapshot?.count ?? d.registrationCount} seats × ${money(d.seatCents)}`}
              icon={Users}
            />
            <Metric
              label="Net funding available"
              value={money(d.totals.net)}
              foot="Captures less fees and refunds"
              icon={Wallet}
            />
            <Metric
              label="Remaining trip gap"
              value={money(d.totals.gap)}
              foot="Includes all unpaid obligations and fees"
              icon={ShieldCheck}
            />
          </div>
          <div className="split">
            <div className="card stack">
              <span className="feature-symbol">
                <HeartHandshake />
              </span>
              <h2>Belonging is something we build together.</h2>
              <p className="muted">
                Optional family sponsorship helps the school fund approved support. Sponsors see
                their own contribution and aggregate progress. They never receive recipient names or
                a link between their payment and a student.
              </p>
              <div className="divider" />
              <h3>How confidential support works</h3>
              {[
                'A family requests support privately in its secure portal.',
                'Separately authorized finance staff review and approve an allocation.',
                'The school freezes exact obligations without exposing recipient mappings.',
                'Voluntary sponsor payments and parent payments are independently captured.',
              ].map((x, i) => (
                <div className="flex" key={x} style={{ alignItems: 'flex-start', fontSize: 12 }}>
                  <span className="avatar" style={{ width: 25, height: 25, fontSize: 10 }}>
                    {i + 1}
                  </span>
                  <p>{x}</p>
                </div>
              ))}
              <Link className="btn secondary" style={{ alignSelf: 'flex-start' }} href="/login">
                Explore as a parent <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="stack">
              <FundingCard d={d} />
              <div className="privacy-card">
                <LockKeyhole size={22} />
                <h3 style={{ marginTop: 10 }}>A boundary that matters.</h3>
                <p>
                  Individual support decisions are visible only in the finance desk. No recipient
                  data enters Gemini, AG Studio, teacher exports, or WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
      {d && view === 'analytics' && (
        <>
          <div className="ai-banner" style={{ margin: '0 0 22px' }}>
            <span className="ai-spark">
              <Sparkles size={20} />
            </span>
            <div>
              <h3>Your data. Your questions. A clearer answer.</h3>
              <p>AG Studio v3 · Editable reports · Gemini Agent Framework · Aggregate data only</p>
            </div>
            <Badge tone="purple">Primary sponsor integration</Badge>
          </div>
          <div className="studio-frame">
            <Studio overview={data} license={studioLicense} />
          </div>
          <p className="muted" style={{ fontSize: 10, marginTop: 13 }}>
            Open Studio’s chat panel to ask a question or create a report. Gemini runs through an
            authenticated server adapter; generation depends on available provider quota. Financial
            actions are outside the agent’s tools.
          </p>
        </>
      )}
      {d &&
        view === 'messages' &&
        (a.role === 'teacher' ? (
          <Notice error>Communication settings are restricted to school administrators.</Notice>
        ) : (
          <div className="split">
            <Chat a={a} tripId={d.trip.id} simulator />
            <div className="stack">
              <div className="card stack">
                <h2>Families stay in the loop.</h2>
                <p className="muted" style={{ fontSize: 12 }}>
                  This clearly labeled simulator uses the same conversation service as the Twilio
                  webhook. It never sends a WhatsApp message.
                </p>
                <div className="divider" />
                <h3>Try a conversation</h3>
                <p className="muted" style={{ fontSize: 12 }}>
                  Ask for trip details, the payment deadline, registration progress, or a secure
                  parent link. Switch to Hindi to see the grounded multilingual flow.
                </p>
                <Badge tone="amber">SIMULATOR · no provider delivery</Badge>
              </div>
              <div className="card stack">
                <h2>Connected conversations</h2>
                <p className="muted" style={{ fontSize: 11 }}>
                  Real reminders require verified opt-in, sandbox participation, and an inbound
                  message within 24 hours.
                </p>
                {conversations.map((c) => (
                  <div className="spread" key={c.id}>
                    <div>
                      <strong style={{ fontSize: 12 }}>{c.phone}</strong>
                      <p className="muted" style={{ fontSize: 10 }}>
                        {c.optedIn ? 'Opted in' : 'Pairing required'}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        run(
                          () => api('messages/remind', { conversationId: c.id }),
                          a.mode === 'demo'
                            ? 'Reminder simulated. No message was sent.'
                            : 'Reminder submitted to Twilio; check delivery status.',
                        )
                      }
                    >
                      {a.mode === 'demo' ? 'Simulate reminder' : 'Send reminder'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      {d &&
        view === 'finance' &&
        (a.role !== 'finance' ? (
          <Notice error>Only separately authorized finance personnel may access this desk.</Notice>
        ) : (
          <>
            <div className="metrics">
              <Metric
                label="Gross captured"
                value={money(d.totals.gross)}
                foot={a.mode === 'demo' ? 'Synthetic captures' : 'PayPal readback'}
                icon={Wallet}
              />
              <Metric
                label="Provider processing fees"
                value={money(d.totals.fees)}
                foot="Deducted from available funds"
                icon={FileText}
              />
              <Metric
                label="Refunds completed"
                value={money(d.totals.refunds)}
                foot="Pending refunds remain unresolved"
                icon={RefreshCw}
              />
              <Metric
                label="Verified funding gap"
                value={money(d.totals.gap)}
                foot={`${d.totals.unresolved} unresolved operation outcomes`}
                icon={AlertTriangle}
              />
            </div>
            <div className="privacy-card" style={{ marginBottom: 22 }}>
              <div className="flex">
                <LockKeyhole size={20} />
                <h3>Restricted assistance decisions</h3>
              </div>
              <p style={{ marginTop: 8 }}>
                Finance only. These recipient mappings never appear in teacher views, analytics
                sources, or AI prompts.
              </p>
            </div>
            <section className="card table-card" style={{ marginBottom: 22 }}>
              <div className="section-heading">
                <h2>Confidential allocations</h2>
                <Badge tone="purple">Finance only</Badge>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fictional student</th>
                      <th>Status</th>
                      <th>Approved allocation</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance?.allocations.map((x) => (
                      <tr key={x.id}>
                        <td>{x.student}</td>
                        <td>
                          <Badge tone={x.status === 'APPROVED' ? 'green' : 'amber'}>
                            {readable(x.status)}
                          </Badge>
                        </td>
                        <td>{money(x.cents)}</td>
                        <td>
                          {x.status === 'REQUESTED' ? (
                            <Button
                              variant="secondary"
                              onClick={() =>
                                run(
                                  () => api('assistance/approve', { id: x.id, cents: d.seatCents }),
                                  'Full-seat support approved. The next pricing snapshot will include it.',
                                )
                              }
                            >
                              Approve {money(d.seatCents)}
                            </Button>
                          ) : (
                            <span className="muted">Recorded before price freeze</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!finance?.allocations.length && (
                <Empty
                  title="No support requests awaiting review."
                  description="Requests arrive privately from authenticated parent portals."
                />
              )}
            </section>
            <section className="card table-card">
              <div className="section-heading">
                <div>
                  <h2>Payment operations</h2>
                  <p>Stable operation identities · Provider readback · Full-refund authorization</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    run(async () => {
                      await extra();
                    }, 'Financial records refreshed.')
                  }
                >
                  <RefreshCw size={14} />
                  Refresh
                </Button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Operation / capture</th>
                      <th>Obligation</th>
                      <th>Status</th>
                      <th>Fee</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance?.operations.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.id.slice(0, 24)}</strong>
                          <small
                            style={{
                              display: 'block',
                              fontSize: 9,
                              color: '#7a8578',
                              marginTop: 4,
                            }}
                          >
                            {o.capture?.providerId || 'Capture not confirmed'}
                          </small>
                        </td>
                        <td>{money(o.cents)}</td>
                        <td>
                          <Badge tone={statusTone(o.status)}>{readable(o.status)}</Badge>
                        </td>
                        <td>{o.capture ? money(o.capture.feeCents) : '—'}</td>
                        <td>
                          <div className="flex">
                            <Button
                              variant="ghost"
                              onClick={() =>
                                run(
                                  () => api('payments/reconcile', { operationId: o.id }),
                                  'Provider status checked. Demo operations retain their labeled synthetic state.',
                                )
                              }
                            >
                              <RefreshCw size={12} />
                              Reconcile
                            </Button>
                            {o.capture?.status === 'COMPLETED' && (
                              <Button
                                variant="danger"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Authorize a full ${money(o.cents)} ${a.mode === 'demo' ? 'simulated' : 'sandbox'} refund? Processing fees may remain deducted.`,
                                    )
                                  )
                                    return run(
                                      () => api('payments/refund', { captureId: o.capture!.id }),
                                      'Refund operation recorded. Provider completion is verified through readback.',
                                    );
                                }}
                              >
                                Refund
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {a.mode === 'demo' && (
              <div className="ai-banner">
                <span className="ai-spark">
                  <CheckCircle2 size={23} />
                </span>
                <div>
                  <h3>See what fully funded looks like.</h3>
                  <p>
                    Simulate all pending captures and a school reserve covering fees and refunded
                    seat costs. This changes only the fictional demo scenario.
                  </p>
                </div>
                <Button
                  onClick={() =>
                    run(
                      () => api(`trips/${d.trip.id}/simulate-funded`, {}),
                      'Fully funded simulation applied. Captures and fee reserve are synthetic.',
                    )
                  }
                >
                  Run funded scenario
                </Button>
              </div>
            )}
            <section className="card table-card" style={{ marginTop: 22 }}>
              <div className="section-heading">
                <h2>Audit trail</h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(audit, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'classequity-audit.json';
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download size={14} />
                  Export audit
                </Button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Entity</th>
                      <th>Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.slice(0, 12).map((x) => (
                      <tr key={x.id}>
                        <td>{readable(x.action)}</td>
                        <td>{x.entityId.slice(0, 32)}</td>
                        <td>{new Date(x.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ))}
      {view === 'settings' &&
        (a.role === 'teacher' ? (
          <Notice error>Workspace configuration is restricted.</Notice>
        ) : (
          <div className="stack">
            <section className="card">
              <div className="section-heading">
                <h2>School identity</h2>
                <Badge tone="green">{a.mode} workspace</Badge>
              </div>
              <form
                className="flex"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(
                    () => api('school', { name: schoolName }),
                    'School name updated. Refresh the page to update the workspace header.',
                  );
                }}
                style={{ alignItems: 'flex-end', maxWidth: 600 }}
              >
                <div style={{ flex: 1 }}>
                  <Field label="School name">
                    <input
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      minLength={3}
                      maxLength={100}
                      required
                    />
                  </Field>
                </div>
                <Button type="submit" disabled={a.role !== 'admin'}>
                  Save school
                </Button>
              </form>
            </section>
            <section className="card stack">
              <h2>School workspaces</h2>
              <p className="muted" style={{ fontSize: 11 }}>
                Create another isolated school or switch to a school you belong to. New schools
                start with your administrator membership; finance must be provisioned separately
                before real operations.
              </p>
              <div className="flex" style={{ flexWrap: 'wrap' }}>
                {schoolList.map((s) => (
                  <Button
                    variant="secondary"
                    key={s.id}
                    onClick={() =>
                      run(async () => {
                        await api('schools/switch', { id: s.id });
                        window.location.reload();
                      }, 'School workspace selected.')
                    }
                  >
                    {s.name}
                  </Button>
                ))}
              </div>
              {a.role === 'admin' && (
                <form
                  className="flex"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(
                      () => api('schools/create', { name: newSchool }),
                      'School created. Select it above to begin.',
                    );
                  }}
                >
                  <input
                    aria-label="New school name"
                    value={newSchool}
                    onChange={(e) => setNewSchool(e.target.value)}
                    placeholder="New school name"
                    minLength={3}
                    maxLength={100}
                    required
                  />
                  <Button type="submit">Create school</Button>
                </form>
              )}
            </section>
            <div className="integration-grid">
              {[
                {
                  key: 'paypal',
                  title: 'PayPal sandbox',
                  icon: Wallet,
                  text: 'Server-created Orders v2 checkout, server capture, Payments v2 readback and full refunds. Human sandbox buyer approval is required.',
                  detail: integration?.paypal?.webhook
                    ? 'Webhook ID configured'
                    : 'Webhook registration pending · public HTTPS required',
                },
                {
                  key: 'twilio',
                  title: 'Twilio WhatsApp',
                  icon: MessageCircle,
                  text: 'Verified request signatures, inbound deduplication, opt-in pairing, delivery callbacks and permitted reminders.',
                  detail: integration?.twilio?.publicHttps
                    ? 'Public HTTPS configured'
                    : 'Public HTTPS webhook URL not configured',
                },
                {
                  key: 'gemini',
                  title: 'Gemini intelligence',
                  icon: Sparkles,
                  text: 'Account-discovered Flash models, vendor quote extraction, multilingual assistance and AG Studio function calling.',
                  detail:
                    'Generation requires available provider quota; local information fallback remains available',
                },
                {
                  key: 'studio',
                  title: 'AG Studio v3.1',
                  icon: Compass,
                  text: 'The genuine React component, editable report state, AG Grid reconciliation, custom widgets and Agent Framework.',
                  detail:
                    'Browser-side trial licence configured; no separate Grid Enterprise entitlement assumed',
                },
              ].map((x) => (
                <section key={x.key} className="card">
                  <div className="spread">
                    <div className="flex">
                      <x.icon size={22} />
                      <h2>{x.title}</h2>
                    </div>
                    <Badge tone={integration?.[x.key]?.configured ? 'green' : 'amber'}>
                      {integration?.[x.key]?.configured ? 'Configured' : 'Needs setup'}
                    </Badge>
                  </div>
                  <p>{x.text}</p>
                  <small className="muted">{x.detail}</small>
                </section>
              ))}
            </div>
            <div className="card stack">
              <h2>Durable, accountable records.</h2>
              <p className="muted" style={{ fontSize: 12 }}>
                Database: {integration?.database?.driver || 'Checking…'} · The demo and sandbox
                schools are isolated. Credentials never appear in this settings screen or browser
                API responses.
              </p>
              <p className="muted" style={{ fontSize: 11 }}>
                APIMatic PayPal and Twilio Context Plugins v0.4.1 informed the integration
                contracts. See the repository documentation for evidence and unverified provider
                behaviors.
              </p>
            </div>
          </div>
        ))}
      {editor && (
        <TripEditor
          d={editor === 'edit' ? d : undefined}
          onClose={() => setEditor(null)}
          onSaved={(id) => {
            setEditor(null);
            void refresh();
            router.push(`/trips/${id}`);
          }}
        />
      )}
    </>
  );
}

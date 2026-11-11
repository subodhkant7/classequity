'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  MapPin,
  CalendarDays,
  Check,
  Wallet,
  LogOut,
  MessageCircle,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  LoaderCircle,
} from 'lucide-react';
import type { Actor } from '@/server/auth';
import type { parentData } from '@/server/data';
import { money, seatPrice } from '@/lib/domain';
import { Badge, Button, Empty, Field, Notice, api } from './ui';
import { Brand } from './brand';
import Museum from './museum';
import { Chat } from './workspace';
type ParentData = Awaited<ReturnType<typeof parentData>>;

interface DemoParentLocalState {
  previewRegistrations?: number;
  previewCeilingCents?: number;
  simulatedPaidObligationIds?: string[];
  simulatedSponsors?: { id: string; cents: number }[];
  pairingCode?: string;
}

const DEMO_PARENT_STORAGE_KEY = 'ce_demo_parent_v1';

function readDemoParentLocalState(): DemoParentLocalState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(DEMO_PARENT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoParentLocalState) : {};
  } catch {
    return {};
  }
}

export default function Parent({
  a,
  trips,
  selected,
}: {
  a: Actor;
  trips: { id: string; name: string }[];
  selected?: string;
}) {
  const router = useRouter();
  const [tripId, setTripId] = useState(selected || trips[0]?.id || '');
  const [rawD, setRawD] = useState<ParentData | null>(null);
  const [demoLocal, setDemoLocal] = useState<DemoParentLocalState>(() =>
    a.mode === 'demo' ? readDemoParentLocalState() : {},
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('trip');
  const [sponsorCents, setSponsorCents] = useState(2300);
  const [phone, setPhone] = useState('');
  const [pair, setPair] = useState('');

  const updateDemoLocal = useCallback(
    (updater: (prev: DemoParentLocalState) => DemoParentLocalState) => {
      setDemoLocal((prev) => {
        const next = updater(prev);
        if (typeof window !== 'undefined') {
          try {
            window.sessionStorage.setItem(DEMO_PARENT_STORAGE_KEY, JSON.stringify(next));
          } catch {}
        }
        return next;
      });
    },
    [],
  );

  const resetDemoLocal = useCallback(() => {
    setDemoLocal({});
    setPair('');
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(DEMO_PARENT_STORAGE_KEY);
      } catch {}
    }
    setNotice('Demo preview reset to canonical family portal records.');
  }, []);

  const hasDemoLocalChanges = useMemo(
    () =>
      a.mode === 'demo' &&
      Boolean(
        demoLocal.previewRegistrations !== undefined ||
          demoLocal.previewCeilingCents !== undefined ||
          (demoLocal.simulatedPaidObligationIds &&
            demoLocal.simulatedPaidObligationIds.length > 0) ||
          (demoLocal.simulatedSponsors && demoLocal.simulatedSponsors.length > 0) ||
          demoLocal.pairingCode,
      ),
    [a.mode, demoLocal],
  );

  const d = useMemo<ParentData | null>(() => {
    if (!rawD) return null;
    if (a.mode !== 'demo') return rawD;
    const regCount = demoLocal.previewRegistrations ?? rawD.registrationCount;
    const previewSeat =
      demoLocal.previewRegistrations !== undefined
        ? seatPrice(rawD.trip.tiers, regCount)
        : rawD.seatCents;
    const ceilingCents =
      demoLocal.previewCeilingCents ?? rawD.consents[0]?.ceilingCents ?? 3200;
    const consents = rawD.consents.map((c, idx) =>
      idx === 0 ? { ...c, ceilingCents, accepted: true } : c,
    );
    const extraObligations = (demoLocal.simulatedSponsors ?? []).map((sp) => ({
      id: sp.id,
      tripId: rawD.trip.id,
      snapshotId: rawD.snapshot?.id ?? 'demo-snapshot',
      userId: a.userId,
      registrationId: null,
      commitmentId: `commit-${sp.id}`,
      kind: 'SPONSOR',
      cents: sp.cents,
      createdAt: new Date(),
    }));
    const obligations = [...rawD.obligations, ...extraObligations];
    const paidIds = new Set(demoLocal.simulatedPaidObligationIds ?? []);
    const operations = obligations
      .map((ob) => {
        const existing = rawD.operations.find((o) => o.obligationId === ob.id);
        if (paidIds.has(ob.id)) {
          return (
            existing
              ? { ...existing, status: 'COMPLETED', errorCode: null }
              : {
                  id: `demo-sim-op-${ob.id}`,
                  schoolId: a.schoolId,
                  obligationId: ob.id,
                  mode: 'demo' as const,
                  orderId: `SIM-ORDER-${ob.id}`,
                  requestKey: `sim-req-${ob.id}`,
                  captureKey: `sim-cap-${ob.id}`,
                  status: 'COMPLETED',
                  approvalUrl: null,
                  errorCode: null,
                  version: 2,
                  captureRequestedAt: new Date(),
                  updatedAt: new Date(),
                  createdAt: new Date(),
                }
          );
        }
        return existing ?? null;
      })
      .filter((o): o is NonNullable<typeof o> => Boolean(o));
    const receipts = operations
      .filter((op) => op.status === 'COMPLETED')
      .map((op) => {
        const existing = rawD.receipts.find((r) => r.operationId === op.id);
        if (existing) return existing;
        const ob = obligations.find((b) => b.id === op.obligationId);
        return {
          id: `demo-sim-cap-${op.id}`,
          operationId: op.id,
          providerId: `SIM-CAP-${op.id.toUpperCase()}`,
          cents: ob?.cents ?? previewSeat,
          feeCents: 90,
          feeKnown: true,
          provenance: 'SYNTHETIC',
          verifiedAt: null,
          providerUpdatedAt: null,
          status: 'COMPLETED',
          refundedCents: 0,
          pendingRefundCents: 0,
          createdAt: new Date(),
        };
      });
    const addedSponsorCents = (demoLocal.simulatedSponsors ?? []).reduce((n, s) => n + s.cents, 0);
    return {
      ...rawD,
      registrationCount: regCount,
      seatCents: previewSeat,
      consents,
      obligations,
      operations,
      receipts,
      totals: {
        ...rawD.totals,
        sponsorCommitted: rawD.totals.sponsorCommitted + addedSponsorCents,
      },
    };
  }, [a.mode, a.schoolId, a.userId, demoLocal, rawD]);

  const load = useCallback(async () => {
    if (!tripId) return;
    try {
      setRawD(await api<ParentData>(`trips/${tripId}/parent`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [tripId]);
  useEffect(() => {
    void load();
  }, [load]);
  const run = async (fn: () => Promise<unknown>, message: string) => {
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(message);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const pay = async (id: string) => {
    if (a.mode === 'demo') {
      updateDemoLocal((prev) => ({
        ...prev,
        simulatedPaidObligationIds: Array.from(
          new Set([...(prev.simulatedPaidObligationIds ?? []), id]),
        ),
      }));
      setNotice(
        'Preview updated in this browser. Simulated capture recorded locally; no PayPal money moved.',
      );
      return;
    }
    return run(
      async () => {
        const result = await api<{ approvalUrl: string | null }>('payments/order', {
          obligationId: id,
        });
        if (result.approvalUrl) {
          window.location.assign(result.approvalUrl);
          return;
        }
      },
      'Sandbox order prepared. Complete buyer approval, then finalize capture.',
    );
  };
  return (
    <>
      <header className="parent-header spread">
        <Brand />
        <div className="flex">
          <Badge tone={a.mode === 'demo' ? 'green' : 'amber'}>
            {a.mode === 'demo' ? 'Interactive parent demo' : 'Sandbox family portal'}
          </Badge>
          <button
            aria-label="Sign out"
            className="icon-button"
            onClick={async () => {
              try {
                window.sessionStorage.removeItem('ce_demo_workspace_v1');
                window.sessionStorage.removeItem('ce_demo_parent_v1');
                window.sessionStorage.removeItem('ce_demo_studio_report_v1');
              } catch {}
              await api('auth/logout', {});
              router.push('/');
              router.refresh();
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main className="parent-main">
        <div className="demo-strip">
          <ShieldCheck size={14} />{' '}
          {a.mode === 'demo'
            ? 'Sample student records. Payments and receipts are simulated.'
            : 'Sample student records · PayPal Sandbox only · No live charges'}
        </div>
        <div className="parent-intro">
          <div className="eyebrow muted">YOUR FAMILY’S NEXT ADVENTURE</div>
          <h1>
            A day of discovery.
            <br />A place for your child.
          </h1>
          <p>
            Welcome, {a.name}. Register, give consent, and follow your own payment with confidence.
            Optional support stays between your family and the school’s finance team.
          </p>
        </div>
        {trips.length > 1 && (
          <Field label="School activity">
            <select value={tripId} onChange={(e) => setTripId(e.target.value)}>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="tabs">
          {[
            { id: 'trip', label: 'The adventure' },
            { id: 'payment', label: 'My payments & receipts' },
            { id: 'support', label: 'Community support' },
            { id: 'assistant', label: 'Ask the trip assistant' },
          ].map((t) => (
            <button
              className={tab === t.id ? 'active' : ''}
              disabled={!d}
              key={t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {error && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        {hasDemoLocalChanges && (
          <div
            className="spread"
            style={{
              padding: '10px 14px',
              marginBottom: 16,
              borderRadius: 10,
              background: '#edf2e5',
              border: '1px solid #d3dacb',
              fontSize: 12,
            }}
          >
            <span>
              <strong>Preview updated in this browser.</strong> Shared demo records remain
              unchanged.
            </span>
            <Button variant="ghost" onClick={resetDemoLocal}>
              Reset demo preview
            </Button>
          </div>
        )}
        {!d ? (
          <div className="loading">
            <LoaderCircle size={18} />
            Loading your family’s trip…
          </div>
        ) : (
          <>
            {tab === 'trip' && (
              <div className="split">
                <div className="stack">
                  <div className="trip-detail-hero">
                    <Museum />
                  </div>
                  <section className="card stack">
                    <Badge tone="green">SCIENCE & DISCOVERY</Badge>
                    <h2>{d.trip.name}</h2>
                    <div className="flex muted" style={{ fontSize: 12, flexWrap: 'wrap' }}>
                      <MapPin size={14} />
                      {d.trip.destination}
                      <span>·</span>
                      <CalendarDays size={14} />
                      {new Date(`${d.trip.date}T12:00:00`).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <p className="muted" style={{ fontSize: 12 }}>
                      {d.trip.description}
                    </p>
                    <div className="divider" />
                    <h3>More classmates. A better group price.</h3>
                    <div className="price-tiers">
                      {d.trip.tiers.map((t) => (
                        <div
                          key={t.min}
                          className={`price-tier ${t.cents === d.seatCents ? 'current' : ''}`}
                        >
                          From {t.min} students<strong>{money(t.cents)}</strong>
                          <small>PER SEAT</small>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 11 }}>
                      {d.registrationCount} students registered.{' '}
                      {d.snapshot
                        ? 'The school has frozen the final group price.'
                        : 'The final price depends on the group size and requires school confirmation.'}
                    </p>
                  </section>
                </div>
                <aside className="stack">
                  <section className="card stack">
                    <div className="spread">
                      <h2>Your family’s place</h2>
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <div className="price-big">
                        {money(d.seatCents)} <small>per student</small>
                      </div>
                      <p className="muted" style={{ fontSize: 11, marginTop: 5 }}>
                        {d.snapshot ? 'Final group price' : 'Current group estimate'} · Payment due{' '}
                        {d.trip.deadline}
                      </p>
                    </div>
                    {d.registrations.length > 0 ? (
                      <>
                        {d.registrations.map((r) => (
                          <div className="receipt stack" key={r.id}>
                            <div className="spread">
                              <strong>{r.student}</strong>
                              <Badge tone="green">Registered</Badge>
                            </div>
                            <p style={{ fontSize: 10 }}>
                              Parent consent recorded up to{' '}
                              <strong>
                                {money(d.consents[0]?.ceilingCents ?? d.seatCents)}
                              </strong>
                              . Any increase above the latest consent ceiling needs renewed
                              approval.
                            </p>
                            {a.mode === 'demo' && (
                              <div
                                style={{
                                  paddingTop: 10,
                                  borderTop: '1px solid #e4e9e2',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 8,
                                }}
                              >
                                <div className="spread" style={{ fontSize: 10 }}>
                                  <strong>Interactive consent & tier preview (browser-local)</strong>
                                  <Badge
                                    tone={
                                      (d.consents[0]?.ceilingCents ?? 3200) >= d.seatCents
                                        ? 'green'
                                        : 'amber'
                                    }
                                  >
                                    {(d.consents[0]?.ceilingCents ?? 3200) >= d.seatCents
                                      ? `Consent covers ${money(d.seatCents)}`
                                      : `Renewed consent required for ${money(d.seatCents)}`}
                                  </Badge>
                                </div>
                                <div className="flex" style={{ flexWrap: 'wrap', gap: 6 }}>
                                  {[2300, 2700, 3200].map((cents) => (
                                    <button
                                      key={cents}
                                      type="button"
                                      className="btn secondary"
                                      style={{ fontSize: 10, minHeight: 28, padding: '4px 9px' }}
                                      onClick={() => {
                                        updateDemoLocal((prev) => ({
                                          ...prev,
                                          previewCeilingCents: cents,
                                        }));
                                        setNotice(
                                          `Preview updated in this browser. Consent ceiling set to ${money(cents)} locally.`,
                                        );
                                      }}
                                    >
                                      Consent ceiling {money(cents)}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex" style={{ flexWrap: 'wrap', gap: 6 }}>
                                  {[19, 20, 30].map((count) => (
                                    <button
                                      key={count}
                                      type="button"
                                      className="btn ghost"
                                      style={{ fontSize: 10, minHeight: 28, padding: '4px 9px' }}
                                      onClick={() => {
                                        updateDemoLocal((prev) => ({
                                          ...prev,
                                          previewRegistrations: count,
                                        }));
                                        setNotice(
                                          `Preview updated in this browser. Group size set to ${count} students (${money(seatPrice(d.trip.tiers, count))}/seat) locally.`,
                                        );
                                      }}
                                    >
                                      Preview {count} students ({money(seatPrice(d.trip.tiers, count))})
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {!d.snapshot && (
                              <div className="flex" style={{ flexWrap: 'wrap' }}>
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    run(
                                      () =>
                                        api('registration/consent', {
                                          id: r.id,
                                          ceilingCents: d.seatCents,
                                        }),
                                      'Consent renewed at the current group price.',
                                    )
                                  }
                                >
                                  Consent at {money(d.seatCents)}
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() =>
                                    run(
                                      () => api('registration/withdraw', { id: r.id }),
                                      'Registration withdrawn. No other approved obligation has been increased.',
                                    )
                                  }
                                >
                                  Withdraw
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                        <Button onClick={() => setTab('payment')}>
                          View my payment <ArrowRight size={14} />
                        </Button>
                      </>
                    ) : !d.snapshot ? (
                      <form
                        className="stack"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          void run(
                            () =>
                              api(`trips/${tripId}/register`, {
                                student: f.get('student'),
                                consent: f.get('consent') === 'on',
                                ceilingCents: d.seatCents,
                              }),
                            'Registration and consent recorded. Your child’s place is counted.',
                          );
                        }}
                      >
                        <Field
                          label="Sample student name"
                          hint="Use sample names only for this demonstration."
                        >
                          <input
                            name="student"
                            placeholder="e.g. Avery Example"
                            required
                            minLength={3}
                            maxLength={80}
                          />
                        </Field>
                        <label className="checkbox">
                          <input type="checkbox" name="consent" required />I consent to this
                          activity and approve a seat price up to {money(d.seatCents)}. A higher
                          price requires my renewed consent. Registration is not payment.
                        </label>
                        <Button type="submit">
                          Register & record consent <ArrowRight size={14} />
                        </Button>
                      </form>
                    ) : (
                      <Empty
                        title="Registration is closed."
                        description="The school has finalized this group. Ask the school about another activity."
                      />
                    )}
                  </section>
                  <section className="privacy-card">
                    <HeartHandshake size={24} />
                    <h3 style={{ marginTop: 13 }}>A little help, handled with care.</h3>
                    <p>
                      You can request financial support privately before the price is frozen. School
                      finance staff review it. Teachers and other families never see your request.
                    </p>
                    <Button variant="ghost" onClick={() => setTab('support')} className="">
                      View confidential support <ArrowUpRightIcon />
                    </Button>
                  </section>
                </aside>
              </div>
            )}
            {tab === 'payment' && (
              <div className="split">
                <section className="card stack">
                  <h2>My payments & receipts</h2>
                  <p className="muted" style={{ fontSize: 12 }}>
                    Amounts come from the school’s immutable pricing snapshot. PayPal approval and
                    completed capture are separate steps.
                  </p>
                  {d.obligations.length === 0 ? (
                    <Empty
                      title="No payment is due yet."
                      description="The school must freeze the final group price before creating exact payment obligations."
                    />
                  ) : (
                    d.obligations.map((ob) => {
                      const op = d.operations.find((o) => o.obligationId === ob.id);
                      const receipt = d.receipts.find((c) => c.operationId === op?.id);
                      return (
                        <div
                          className="card stack"
                          key={ob.id}
                          style={{ padding: 19, background: '#fafbf7' }}
                        >
                          <div className="spread">
                            <div>
                              <small className="eyebrow muted">
                                {ob.kind === 'SPONSOR'
                                  ? 'VOLUNTARY SPONSORSHIP'
                                  : 'MY STUDENT SEAT'}
                              </small>
                              <div style={{ fontSize: 27, fontWeight: 650, marginTop: 8 }}>
                                {money(ob.cents)}
                              </div>
                            </div>
                            <Badge
                              tone={
                                op?.status === 'COMPLETED' || ob.cents === 0
                                  ? 'green'
                                  : op?.status === 'FAILED'
                                    ? 'red'
                                    : 'amber'
                              }
                            >
                              {ob.cents === 0
                                ? 'No family payment due'
                                : op?.status.replaceAll('_', ' ') || 'UNPAID'}
                            </Badge>
                          </div>
                          {ob.cents > 0 &&
                            op?.status !== 'COMPLETED' &&
                            op?.status !== 'REFUNDED' && (
                              <div className="flex" style={{ flexWrap: 'wrap' }}>
                                <Button onClick={() => pay(ob.id)}>
                                  <Wallet size={15} />
                                  {a.mode === 'demo'
                                    ? 'Simulate payment'
                                    : 'Open PayPal sandbox checkout'}
                                </Button>
                                {a.mode === 'sandbox' && op?.orderId && (
                                  <Button
                                    variant="secondary"
                                    onClick={() =>
                                      run(
                                        () => api('payments/capture', { obligationId: ob.id }),
                                        'Capture submitted and read back from PayPal. Check the receipt status.',
                                      )
                                    }
                                  >
                                    <Check size={14} />
                                    Finalize approved payment
                                  </Button>
                                )}
                                {op && (
                                  <Button
                                    variant="ghost"
                                    onClick={() => {
                                      if (a.mode === 'demo') {
                                        setNotice(
                                          'Preview updated in this browser. Demo payment status remains simulated.',
                                        );
                                        return;
                                      }
                                      return run(
                                        () => api('payments/reconcile', { operationId: op.id }),
                                        'Payment status refreshed.',
                                      );
                                    }}
                                  >
                                    <RefreshCw size={13} />
                                    Check status
                                  </Button>
                                )}
                              </div>
                            )}
                          {receipt && (
                            <div className="receipt">
                              <div className="flex" style={{ marginBottom: 10 }}>
                                <ReceiptText size={16} />
                                <strong>
                                  {a.mode === 'demo'
                                    ? 'Simulated receipt'
                                    : 'PayPal sandbox receipt'}
                                </strong>
                              </div>
                              <p>Capture: {receipt.providerId}</p>
                              <p>
                                Gross amount: {money(receipt.cents)} · Status: {receipt.status}
                              </p>
                              <p>
                                Processing fee:{' '}
                                {receipt.feeKnown ? money(receipt.feeCents) : 'Accounting pending'}{' '}
                                · Refunded: {money(receipt.refundedCents)}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </section>
                <div className="stack">
                  <section className="card stack">
                    <LockKeyhole size={25} />
                    <h2>Exactly what you approved.</h2>
                    <p className="muted" style={{ fontSize: 12 }}>
                      Your seat payment and optional sponsorship have separate obligations. An
                      ambiguous provider result stays unresolved until readback confirms the
                      outcome. Repeated clicks reuse the same payment-operation identity.
                    </p>
                    <p className="muted" style={{ fontSize: 11 }}>
                      For cancellations after price finalization, contact school finance. Refunds
                      require a separate finance authorization.
                    </p>
                  </section>
                  <div className="notice">
                    <ShieldCheck size={20} />
                    <p>
                      {a.mode === 'demo'
                        ? 'Demo payments never call PayPal. Receipts are simulated examples.'
                        : 'Use your personal PayPal sandbox buyer account. A human must complete buyer approval. Never use a live PayPal account here.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {tab === 'support' && (
              <div className="split">
                <section className="card stack">
                  <HeartHandshake size={29} color="#66834d" />
                  <h2>A little extra can open a door.</h2>
                  <p className="muted" style={{ fontSize: 12 }}>
                    Sponsorship is entirely optional. You choose an exact contribution to help the
                    school cover approved support and trip costs. You will see your own payment,
                    never recipient identities.
                  </p>
                  <div className="form-grid">
                    <div className="mini-stat">
                      <strong>{money(d.totals.sponsorCommitted)}</strong>
                      <small>Voluntary community commitments</small>
                    </div>
                    <div className="mini-stat">
                      <strong>{money(d.totals.gap)}</strong>
                      <small>Remaining aggregate trip gap, net of fees</small>
                    </div>
                  </div>
                  <Field
                    label="My optional contribution (USD cents)"
                    hint="For example, 2300 cents is $23.00. A commitment is not a capture."
                  >
                    <input
                      type="number"
                      value={sponsorCents}
                      min={100}
                      max={100000}
                      onChange={(e) => setSponsorCents(Number(e.target.value))}
                    />
                  </Field>
                  <Button
                    onClick={() => {
                      if (a.mode === 'demo') {
                        updateDemoLocal((prev) => ({
                          ...prev,
                          simulatedSponsors: [
                            ...(prev.simulatedSponsors ?? []),
                            {
                              id: `demo-sim-sponsor-${(prev.simulatedSponsors?.length ?? 0) + 1}`,
                              cents: sponsorCents,
                            },
                          ],
                        }));
                        setNotice(
                          `Preview updated in this browser. Your ${money(sponsorCents)} sponsorship commitment is simulated locally.`,
                        );
                        return;
                      }
                      return run(
                        () => api(`trips/${tripId}/sponsor`, { cents: sponsorCents }),
                        `Your ${money(sponsorCents)} sponsorship commitment is recorded. Complete its separate payment from My payments.`,
                      );
                    }}
                  >
                    Commit {money(sponsorCents)} voluntarily <HeartHandshake size={16} />
                  </Button>
                  <p className="muted" style={{ fontSize: 10 }}>
                    This demonstration is school activity coordination, not a regulated escrow,
                    charitable trust, or nonprofit payment service.
                  </p>
                </section>
                <div className="stack">
                  <section className="privacy-card">
                    <LockKeyhole size={25} />
                    <h3 style={{ marginTop: 15 }}>Request support privately.</h3>
                    <p>
                      Only separately authorized finance personnel can review this request. No
                      documents are needed for the interactive demo. Do not share hardship documents
                      through WhatsApp or AI.
                    </p>
                    {d.registrations.map((r) => (
                      <div key={r.id} style={{ marginTop: 17 }}>
                        <Button
                          variant="secondary"
                          disabled={!!d.snapshot}
                          onClick={() =>
                            run(
                              () => api('assistance/request', { registrationId: r.id }),
                              'Your private support request was submitted to school finance.',
                            )
                          }
                        >
                          Request support for {r.student}
                        </Button>
                      </div>
                    ))}
                    {d.snapshot && (
                      <p style={{ marginTop: 12 }}>
                        Pricing is already frozen. Contact school finance for a confidential review.
                      </p>
                    )}
                  </section>
                  <section className="card stack">
                    <MessageCircle size={24} />
                    <h2>Connect with WhatsApp</h2>
                    <p className="muted" style={{ fontSize: 11 }}>
                      Join your school’s Twilio WhatsApp sandbox first. Link your number by sending
                      the code below from that number. This verifies ownership and records opt-in.
                    </p>
                    <Field label="WhatsApp number, international format">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+15551234567"
                      />
                    </Field>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (a.mode === 'demo') {
                          const code = 'LINK DEMO-PREVIEW';
                          setPair(code);
                          updateDemoLocal((prev) => ({ ...prev, pairingCode: code }));
                          setNotice(
                            'Preview updated in this browser. WhatsApp pairing code simulated locally.',
                          );
                          return;
                        }
                        return run(async () => {
                          const result = await api<{ pairingCode: string }>('messages/connect', {
                            tripId,
                            phone,
                          });
                          setPair(result.pairingCode);
                        }, 'Send the pairing code from your own WhatsApp number to confirm opt-in.');
                      }}
                    >
                      Create pairing code
                    </Button>
                    {(pair || demoLocal.pairingCode) && (
                      <code className="receipt">{pair || demoLocal.pairingCode}</code>
                    )}
                  </section>
                </div>
              </div>
            )}
            {tab === 'assistant' && (
              <div className="split">
                <Chat a={a} tripId={tripId} />
                <div className="card stack" style={{ alignSelf: 'start' }}>
                  <SparkleIcon />
                  <h2>School facts, in your language.</h2>
                  <p className="muted" style={{ fontSize: 12 }}>
                    Ask about the trip, group prices, or deadlines in English or Hindi. The
                    assistant receives only school-approved trip facts. Individual support and
                    financial authorizations stay outside the conversation.
                  </p>
                  <p className="muted" style={{ fontSize: 11 }}>
                    When Gemini is unavailable, a clearly labeled local assistant answers using the
                    same approved facts.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={13} />;
}
function SparkleIcon() {
  return <ShieldCheck size={26} />;
}

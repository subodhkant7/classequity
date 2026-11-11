'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import {
  AgStudio,
  AgStudioProvider,
  createWidgets,
  type AgWidgetDefinition,
} from 'ag-studio-react';
import {
  AgStudioAiModule,
  AgStudioLicenseManager,
  createAiHarness,
  directLlmRunner,
  type AgWidgetsConfig,
  type AgCoreDefaultRegistry,
  type AgAiHarnessSetup,
  type AgStudioApi,
  type AgAiEvent,
  type AgBaseRegistry,
  type AgDefaultWidgetDefinition,
  type AgReportState,
  type AgWidgetData,
  type AgWidgetDataFormat,
  type AgWidgetField,
  type AgWidgetFieldReference,
  type AgWidgetParams,
  type AgLlmAdapter,
  type AgLlmResponse,
  type AgDataSourcesDefinition,
} from 'ag-studio';
import { CheckCircle2 } from 'lucide-react';
import { money } from '@/lib/domain';
import { tripStudioFields, tierStudioFields, operationStudioFields } from '@/lib/studio-fields';
import type { dashboardData } from '@/server/data';
import { api, Notice } from './ui';
type Overview = Awaited<ReturnType<typeof dashboardData>>;
type CustomKind = 'group-unlock' | 'funding-assurance' | 'payment-integrity';
type CustomState<K extends CustomKind = CustomKind> = AgWidgetData<
  { value: AgWidgetFieldReference[] },
  AgWidgetDataFormat<Record<string, never>>
> & { type: K };
type CustomOutput<K extends CustomKind = CustomKind> = Omit<CustomState<K>, 'dataMapping'> & {
  dataMapping: { value: AgWidgetField[] };
};
type CustomDef = {
  [K in CustomKind]: AgWidgetDefinition<K, CustomState<K>, CustomOutput<K>>;
}[CustomKind];
interface Registry extends AgBaseRegistry {
  widgets: readonly (AgDefaultWidgetDefinition | CustomDef)[];
}
type Context = { overview: Overview };
class DomainWidget {
  private root = document.createElement('div');
  init(params: AgWidgetParams<CustomOutput, unknown, Context>) {
    this.render(params);
  }
  getGui() {
    return this.root;
  }
  refresh(params: AgWidgetParams<CustomOutput, unknown, Context>) {
    this.render(params);
  }
  private render({ widgetType, context }: AgWidgetParams<CustomOutput, unknown, Context>) {
    const d = context.overview[0];
    if (!d) {
      this.root.textContent = 'No activity yet.';
      return;
    }
    const funding = widgetType === 'funding-assurance',
      integrity = widgetType === 'payment-integrity';
    const next = d.trip.tiers
      .filter((t) => t.min > d.registrationCount)
      .sort((a, b) => a.min - b.min)[0];
    const title = document.createElement('h3');
    title.textContent = integrity
      ? 'Payment Integrity'
      : funding
        ? 'Funding Assurance'
        : 'Group Unlock';
    const value = document.createElement('div');
    value.textContent = integrity
      ? String(d.totals.unresolved)
      : funding
        ? money(d.totals.gap)
        : money(d.seatCents);
    Object.assign(value.style, {
      fontSize: '34px',
      fontWeight: '650',
      letterSpacing: '-1px',
      margin: '18px 0 8px',
    });
    const caption = document.createElement('p');
    caption.textContent = integrity
      ? `unresolved payment operations · ${d.totals.feePending} fee accounts pending`
      : funding
        ? `funding gap · ${money(d.totals.net)} net confirmed`
        : `per seat · ${d.registrationCount} verified registrations`;
    Object.assign(caption.style, { fontSize: '11px', color: '#67756f' });
    const detail = document.createElement('p');
    detail.textContent = integrity
      ? `${d.payments.filter((p) => p.status === 'COMPLETED').length} captured · ${d.payments.filter((p) => p.status === 'FAILED').length} failed · ${d.payments.filter((p) => p.status === 'REFUNDED').length} refunded · ${d.payments.filter((p) => p.status === 'UNKNOWN').length} unknown`
      : funding
        ? d.totals.ready
          ? `Net funding covers all ${d.coverage.coveredSeats} seats and fees. ${d.mode === 'demo' ? 'Interactive demo scenario.' : 'Sandbox captures / finance-attested treasury.'}`
          : `Required: ${money(d.totals.required)}. ${d.coverage.coveredSeats} covered, ${d.coverage.parentPaidSeats} parent paid, ${d.coverage.fullyAssistedSeats} fully assisted. Fee accounts pending: ${d.totals.feePending}; reserved ${money(d.totals.feeReserve)}.`
        : next
          ? `${next.min - d.registrationCount} more registrations unlock ${money(next.cents)} seats, with ${money((d.seatCents - next.cents) * next.min)} projected cohort savings. Consent and price freeze required.`
          : 'Best configured tier unlocked. A frozen price cannot silently increase after withdrawals.';
    Object.assign(detail.style, {
      fontSize: '10px',
      color: '#67756f',
      borderTop: '1px solid #d3dacb',
      paddingTop: '14px',
      marginTop: '16px',
      lineHeight: '1.7',
    });
    Object.assign(this.root.style, {
      padding: '22px',
      height: '100%',
      overflow: 'auto',
      borderRadius: '12px',
      background: funding ? '#edf2e5' : integrity ? '#f8f2e5' : '#edeaf5',
    });
    this.root.replaceChildren(title, value, caption, detail);
  }
}
const format = (text: string) => ({ title: { enabled: true, text } });
const sum = (id: string) => ({ id, aggregation: 'sum' as const });
const at = (xTrack: number, yTrack: number, xSpan: number, ySpan: number) => ({
  xTrack,
  yTrack,
  xSpan,
  ySpan,
});
const initial: AgReportState<Registry> = {
  selectedPageId: 'Financial overview',
  panels: {
    ai: { collapsed: true },
    filters: { collapsed: true },
    data: { collapsed: true },
    edit: { collapsed: true },
  },
  pages: [
    {
      id: 'Financial overview',
      widgets: {
        unlock: { type: 'group-unlock', dataMapping: { value: [sum('trips.registered')] } },
        assurance: { type: 'funding-assurance', dataMapping: { value: [sum('trips.gapUsd')] } },
        integrity: { type: 'payment-integrity', dataMapping: { value: [sum('trips.unresolved')] } },
      },
      widgetLayout: {
        unlock: at(0, 0, 8, 15),
        assurance: at(8, 0, 8, 15),
        integrity: at(16, 0, 8, 15),
      },
      layout: {
        rowHeight: 24,
        widgetPadding: 8,
        pagePadding: 16,
        minWidth: 600,
        backgroundColor: '#f7f8f5',
        widgetBorderRadius: 12,
      },
    },
    {
      id: 'Funding & covered seats',
      widgets: {
        funding: {
          type: 'column-chart-grouped',
          dataMapping: {
            categoryKey: [{ id: 'trips.trip' }],
            valueKey: [sum('trips.requiredUsd'), sum('trips.netUsd'), sum('trips.gapUsd')],
          },
          format: format('Trip financial overview · USD'),
        },
        seats: {
          type: 'bar-chart-grouped',
          dataMapping: {
            categoryKey: [{ id: 'trips.trip' }],
            valueKey: [
              sum('trips.registered'),
              sum('trips.parentPaidSeats'),
              sum('trips.fullyAssistedSeats'),
              sum('trips.confirmedSeats'),
              sum('trips.unresolvedSeats'),
            ],
          },
          format: format('Registered vs financially covered seats'),
        },
      },
      widgetLayout: { funding: at(0, 0, 14, 20), seats: at(14, 0, 10, 20) },
    },
    {
      id: 'Group pricing progress',
      widgets: {
        unlock: {
          type: 'value',
          dataMapping: { value: [sum('trips.registered')] },
          format: format('Verified registrations'),
        },
        price: {
          type: 'column-chart-grouped',
          dataMapping: {
            categoryKey: [{ id: 'tiers.threshold' }],
            valueKey: [sum('tiers.seatUsd')],
          },
          format: format('Configured group tiers · USD per seat'),
        },
        seats: {
          type: 'grid',
          dataMapping: {
            cols: [
              { id: 'trips.trip' },
              { id: 'trips.registered' },
              { id: 'trips.confirmedSeats' },
              { id: 'trips.parentPaidSeats' },
              { id: 'trips.fullyAssistedSeats' },
              { id: 'trips.unresolvedSeats' },
              { id: 'trips.feePending' },
              { id: 'trips.feeReserveUsd' },
              { id: 'trips.refundReserveUsd' },
              { id: 'trips.schoolContributionUsd' },
              { id: 'trips.source' },
              { id: 'trips.pricing' },
            ],
          },
          format: format('Registration is separate from payment'),
        },
      },
      widgetLayout: { unlock: at(0, 0, 8, 12), price: at(8, 0, 16, 17), seats: at(0, 17, 24, 15) },
    },
    {
      id: 'Sponsorship funding',
      widgets: {
        commitments: {
          type: 'value',
          dataMapping: { value: [sum('trips.sponsorCommittedUsd')] },
          format: format('Sponsor commitments · USD'),
        },
        net: {
          type: 'value',
          dataMapping: { value: [sum('trips.netUsd')] },
          format: format('Net available · USD'),
        },
        gap: {
          type: 'value',
          dataMapping: { value: [sum('trips.gapUsd')] },
          format: format('Remaining trip gap · USD'),
        },
        assurance: {
          type: 'value',
          dataMapping: { value: [sum('trips.gapUsd')] },
          format: format('Funding gap · USD'),
        },
      },
      widgetLayout: {
        commitments: at(0, 0, 8, 9),
        net: at(8, 0, 8, 9),
        gap: at(16, 0, 8, 9),
        assurance: at(0, 9, 12, 14),
      },
    },
    {
      id: 'Payment reconciliation',
      widgets: {
        integrity: {
          type: 'value',
          dataMapping: { value: [sum('trips.unresolved')] },
          format: format('Unresolved payment operations'),
        },
        statuses: {
          type: 'donut-chart',
          dataMapping: {
            categoryKey: [{ id: 'operations.status' }],
            valueKey: [sum('operations.count')],
          },
          format: format('Pending, failed and confirmed outcomes'),
        },
        ledger: {
          type: 'grid',
          dataMapping: {
            cols: [
              { id: 'trips.trip' },
              { id: 'trips.grossUsd' },
              { id: 'trips.feesUsd' },
              { id: 'trips.refundsUsd' },
              { id: 'trips.netUsd' },
              { id: 'trips.gapUsd' },
              { id: 'trips.unresolved' },
              { id: 'trips.source' },
            ],
          },
          format: format('Financial reconciliation · USD · aggregate only'),
        },
      },
      widgetLayout: {
        integrity: at(0, 0, 10, 12),
        statuses: at(10, 0, 14, 17),
        ledger: at(0, 17, 24, 18),
      },
    },
    {
      id: 'Trip comparison',
      widgets: {
        compare: {
          type: 'bar-chart-grouped',
          dataMapping: {
            categoryKey: [{ id: 'trips.trip' }],
            valueKey: [sum('trips.requiredUsd'), sum('trips.netUsd')],
          },
          format: format('Funding outcomes across available trips'),
        },
        ledger: {
          type: 'grid',
          dataMapping: {
            cols: [
              { id: 'trips.trip' },
              { id: 'trips.registered' },
              { id: 'trips.gapUsd' },
              { id: 'trips.pricing' },
            ],
          },
          format: format('Available history · no fabricated historical trips'),
        },
      },
      widgetLayout: { compare: at(0, 0, 24, 18), ledger: at(0, 18, 24, 15) },
    },
  ],
};
export const geminiAdapter: AgLlmAdapter = {
  executeTurn(request, options) {
    const complete = (async () => {
      const response = await fetch('/api/studio/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: options?.signal,
      });
      const value = await response.json();
      if (!response.ok) throw Error(value.error || 'Analytics provider unavailable');
      return value as AgLlmResponse;
    })();
    const stream = {
      async *[Symbol.asyncIterator]() {
        const result = await complete;
        for (const item of result.output) {
          if (item.type === 'message') {
            yield {
              type: 'TEXT_MESSAGE_START',
              messageId: item.id,
              role: 'assistant',
            } satisfies AgAiEvent;
            for (const c of item.content)
              if (c.type === 'text')
                yield {
                  type: 'TEXT_MESSAGE_CONTENT',
                  messageId: item.id,
                  delta: c.text,
                } satisfies AgAiEvent;
            yield { type: 'TEXT_MESSAGE_END', messageId: item.id } satisfies AgAiEvent;
          }
          if (item.type === 'function_call') {
            yield {
              type: 'TOOL_CALL_START',
              toolCallId: item.callId,
              toolCallName: item.name,
            } satisfies AgAiEvent;
            yield {
              type: 'TOOL_CALL_ARGS',
              toolCallId: item.callId,
              delta: item.arguments,
            } satisfies AgAiEvent;
            yield { type: 'TOOL_CALL_END', toolCallId: item.callId } satisfies AgAiEvent;
          }
        }
      },
    };
    return { complete, stream };
  },
};
const DEMO_STUDIO_STORAGE_KEY = 'ce_demo_studio_report_v1';

export default function Studio({
  overview,
  license,
  presentation = false,
}: {
  overview: Overview;
  license?: string;
  presentation?: boolean;
}) {
  const apiRef = useRef<AgStudioApi<Registry> | null>(null);
  const initialReadyRef = useRef(false);
  const suppressNextUpdateRef = useRef(false);
  const isDemo = presentation || overview[0]?.mode === 'demo';
  const [pageId, setPageId] = useState('Financial overview');
  const [state, setState] = useState<AgReportState<Registry> | null>(null);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (license) AgStudioLicenseManager.setLicenseKey(license);
    if (presentation) {
      setState(initial);
      setPageId(initial.selectedPageId);
      return;
    }
    if (isDemo) {
      try {
        const raw = window.sessionStorage.getItem(DEMO_STUDIO_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AgReportState<Registry>;
          if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
            setState(parsed);
            setPageId(parsed.selectedPageId || initial.selectedPageId);
            setSaved('Preview updated in this browser.');
            return;
          }
        }
      } catch {}
      setState(initial);
      setPageId(initial.selectedPageId);
      return;
    }
    api<AgReportState<Registry> | null>('studio/state')
      .then((s) => {
        setState(s || initial);
        setPageId((s || initial).selectedPageId);
      })
      .catch(() => setState(initial));
  }, [isDemo, license, presentation]);
  const context = useMemo<Context>(() => ({ overview }), [overview]);
  const data = useMemo<AgDataSourcesDefinition<Registry>>(
    () => ({
      sources: [
        {
          id: 'trips',
          fields: tripStudioFields,
          name: 'Trip financial aggregates',
          description:
            'Tenant-scoped aggregate finance only. No student, parent, phone, assistance eligibility or recipient mapping fields. USD display values derive from integer cents.',
          data: overview.map((d) => ({
            trip: d.trip.name,
            registered: d.registrationCount,
            confirmedSeats: d.confirmedSeats,
            outstandingObligationCents: d.outstandingObligationCents,
            parentPaidSeats: d.coverage.parentPaidSeats,
            fullyAssistedSeats: d.coverage.fullyAssistedSeats,
            unresolvedSeats: d.coverage.unresolvedSeats,
            feePending: d.totals.feePending,
            feeReserveUsd: d.totals.feeReserve / 100,
            refundReserveUsd: d.totals.refundReserve / 100,
            schoolContributionUsd: d.totals.schoolCents / 100,
            requiredUsd: d.totals.required / 100,
            grossUsd: d.totals.gross / 100,
            feesUsd: d.totals.fees / 100,
            refundsUsd: d.totals.refunds / 100,
            netUsd: d.totals.net / 100,
            gapUsd: d.totals.gap / 100,
            sponsorCommittedUsd: d.totals.sponsorCommitted / 100,
            unresolved: d.totals.unresolved,
            pricing: d.snapshot ? 'Frozen' : 'Estimate',
            source:
              d.mode === 'demo'
                ? 'SIMULATED'
                : 'Sandbox captures and finance-attested school contributions',
          })),
        },
        {
          id: 'operations',
          fields: operationStudioFields,
          name: 'Payment status counts',
          data: overview.flatMap((d) =>
            Object.entries(
              d.payments.reduce<Record<string, number>>(
                (m, p) => ({ ...m, [p.status]: (m[p.status] || 0) + 1 }),
                {},
              ),
            ).map(([status, count]) => ({ trip: d.trip.name, status, count })),
          ),
        },
        {
          id: 'tiers',
          fields: tierStudioFields,
          name: 'Group pricing tiers',
          data: overview.flatMap((d) =>
            d.trip.tiers.map((t) => ({
              trip: d.trip.name,
              threshold: `${t.min}+ students`,
              seatUsd: t.cents / 100,
            })),
          ),
        },
      ],
    }),
    [overview],
  );
  const widgets = useMemo(
    () => (defaults: AgWidgetsConfig<AgCoreDefaultRegistry>) =>
      createWidgets<Registry>({
        defaultType: defaults.defaultType,
        additionalTypes: (['group-unlock', 'funding-assurance', 'payment-integrity'] as const).map(
          (id): CustomDef => ({
            id,
            label:
              id === 'group-unlock'
                ? 'Group Unlock'
                : id === 'funding-assurance'
                  ? 'Funding Assurance'
                  : 'Payment Integrity',
            comp: DomainWidget,
            dataMapping: {
              value: {
                type: 'field',
                supportedRoles: ['numeric'],
                requires: { cardinality: 'one' },
                required: true,
              },
            },
            form: (p) =>
              p.createDefaults({
                dataMappingItems: [{ key: 'value', label: 'Aggregate indicator' }],
              }),
            defaultSize: { width: 340, height: 250 },
            minSize: { width: 230, height: 180 },
            ai: {
              description:
                'Read-only ClassEquity domain indicator. Uses only aggregate context. Configure other built-in widgets for new analytical views.',
            },
          }),
        ),
        menu: [
          ...defaults.menu,
          {
            label: 'ClassEquity',
            widgetIds: ['group-unlock', 'funding-assurance', 'payment-integrity'],
          },
        ],
      }),
    [],
  );
  const ai = useMemo<AgAiHarnessSetup>(
    () =>
      ({ api: coreApi }) => {
        // The UI framework supplies the full Studio API at runtime; its setup interface exposes the core half.
        const studioApi = coreApi as AgStudioApi;
        const summary = studioApi.defineAiTool({
          name: 'school_financial_summary',
          description:
            'Read only tenant-scoped aggregate trip finances and safe operation IDs/statuses. No recipient or eligibility data.',
          params: (s) => s.object({}),
          execute: (_args, ctx) =>
            ctx.success(
              'Authoritative aggregate financial summary.',
              overview.map((d) => ({
                trip: d.trip.name,
                registrations: d.registrationCount,
                confirmedSeats: d.confirmedSeats,
                outstandingObligationCents: d.outstandingObligationCents,
                parentPaidSeats: d.coverage.parentPaidSeats,
                fullyAssistedSeats: d.coverage.fullyAssistedSeats,
                unresolvedSeats: d.coverage.unresolvedSeats,
                feePending: d.totals.feePending,
                feeReserveUsd: d.totals.feeReserve / 100,
                refundReserveUsd: d.totals.refundReserve / 100,
                schoolContributionUsd: d.totals.schoolCents / 100,
                seatCents: d.seatCents,
                requiredCents: d.totals.required,
                netCents: d.totals.net,
                gapCents: d.totals.gap,
                feesCents: d.totals.fees,
                refundsCents: d.totals.refunds,
                unresolved: d.totals.unresolved,
                pricing: d.snapshot ? 'Frozen' : 'Estimated',
                tiers: d.trip.tiers,
                operations: d.payments.map((p) => ({
                  id: p.id,
                  status: p.status,
                  simulation: p.mode === 'demo',
                })),
              })),
            ),
        });
        const build = studioApi.defineAiTool({
          name: 'build_financial_view',
          description:
            'Create or update an actual editable AG Studio analytical report page with validated native widgets. Presentation only. Choose comparison for cross-trip outcomes, funding for required/net/gap and seats, pricing for group thresholds, payments for reconciliation. Never changes money or school policy.',
          params: (s) =>
            s.object({ view: s.enum(['comparison', 'funding', 'pricing', 'payments']) }),
          execute: (args, ctx) => {
            const definitions = {
              comparison: { source: 'Trip comparison', id: 'AI · Trip funding comparison' },
              funding: { source: 'Funding & covered seats', id: 'AI · Funding assurance' },
              pricing: { source: 'Group pricing progress', id: 'AI · Group pricing' },
              payments: { source: 'Payment reconciliation', id: 'AI · Payment reconciliation' },
            };
            const target = definitions[args.view];
            const template = initial.pages.find((p) => p.id === target.source)!;
            const prior = apiRef.current?.getState();
            if (!prior || !template) return ctx.error('The report is not ready.');
            const page = { ...template, id: target.id };
            const next = {
              ...prior,
              selectedPageId: page.id,
              pages: [...prior.pages.filter((p) => p.id !== page.id), page],
            };
            apiRef.current!.setState(next);
            setState(next);
            setPageId(page.id);
            return ctx.success(`Created editable report page: ${page.id}.`, {
              pageId: page.id,
              widgets: Object.keys(page.widgets || {}),
              financialStateChanged: false,
            });
          },
        });
        return createAiHarness(studioApi, () => ({
          primary: 'school-finance',
          agents: [
            directLlmRunner({
              id: 'school-finance',
              name: 'ClassEquity financial assistant',
              adapter: geminiAdapter,
              maxTurns: 5,
              instructions: () =>
                'You are a concise school financial analyst. Answer only from school_financial_summary and the server aggregate snapshot. Cents are integer USD cents. Always call build_financial_view when asked to build, compare, create, or adjust a financial report, choosing the closest supported view. The tool creates a real editable analytical page. After successful tool results, summarize the result and stop. Do not invent arbitrary widget IDs or source fields. Do not change payments, consent, pricing, assistance, or eligibility. Do not disclose or infer recipient identities. Explain that registration, commitments and approvals are not captured money; fees and refunds reduce net. Withdrawals after a frozen price require finance review and cannot silently increase approved obligations.',
              tools: () => [summary, build],
              defaultToolCalls: () => [{ tool: 'school_financial_summary', args: {} }],
            }),
          ],
          promptStarters: [
            {
              label: 'Explain the funding gap',
              prompt:
                'Why is the trip pending? Explain the verified net funding gap and unresolved payment states.',
            },
            {
              label: 'Compare trip outcomes',
              prompt:
                'Build a report comparing required and net funding across the available trips.',
            },
            {
              label: 'Explore group pricing',
              prompt:
                'Which pricing tier applies, and what happens if three students withdraw after the price is frozen?',
            },
          ],
        }));
      },
    [overview],
  );

  if (!state) return <div className="loading">Preparing your saved Studio report…</div>;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        className="spread"
        style={{ padding: '10px 15px', borderBottom: '1px solid #e4e9e2', fontSize: 10 }}
      >
        <span className="flex">
          <CheckCircle2 size={14} />
          {saved || 'ClassEquity report · AG Studio 3.1.0'}
          <button
            className="btn ghost"
            style={{ fontSize: 9, minHeight: 24, padding: '3px 7px' }}
            onClick={() => {
              if (isDemo && !presentation) {
                try {
                  window.sessionStorage.removeItem(DEMO_STUDIO_STORAGE_KEY);
                } catch {}
                setSaved('Starter report restored.');
              }
              suppressNextUpdateRef.current = true;
              const studio = apiRef.current;
              if (studio) {
                studio.setState(initial);
              }
              setState(initial);
              setPageId(initial.selectedPageId);
            }}
          >
            Restore starter report
          </button>
        </span>
        {isDemo && (
          <button
            className="text-button"
            onClick={() => {
              const studio = apiRef.current;
              const template = initial.pages.find((p) => p.id === 'Trip comparison')!;
              const page = { ...template, id: 'Recorded AI · Trip comparison' };
              const baseState = studio ? studio.getState() : state;
              const next: AgReportState<Registry> = {
                ...baseState,
                selectedPageId: page.id,
                pages: [...initial.pages, page],
              };
              if (studio) studio.setState(next);
              setState(next);
              setPageId(page.id);
              if (!presentation) {
                try {
                  window.sessionStorage.setItem(DEMO_STUDIO_STORAGE_KEY, JSON.stringify(next));
                } catch {}
              }
              setSaved('Preview updated in this browser.');
            }}
          >
            Replay recorded AI view
          </button>
        )}
        <select
          aria-label="Report page"
          value={pageId}
          style={{ width: 230, fontSize: 11, padding: 7 }}
          onChange={(e) => {
            const nextPageId = e.target.value;
            setPageId(nextPageId);
            const studio = apiRef.current;
            const nextState: AgReportState<Registry> = {
              ...(studio ? studio.getState() : state),
              selectedPageId: nextPageId,
            };
            if (studio) studio.setState(nextState);
            setState(nextState);
            if (isDemo) {
              if (!presentation) {
                try {
                  window.sessionStorage.setItem(DEMO_STUDIO_STORAGE_KEY, JSON.stringify(nextState));
                } catch {}
              }
              setSaved('Preview updated in this browser.');
            }
          }}
        >
          {state.pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id}
            </option>
          ))}
        </select>
      </div>
      {error && <Notice error>{error}</Notice>}
      <div style={{ flex: 1, minHeight: 0 }}>
        <AgStudioProvider modules={[AgStudioAiModule]}>
          <AgStudio<Registry>
            style={{ height: '100%', width: '100%' }}
            data={data}
            mode="edit"
            initialState={state}
            widgets={widgets}
            context={context}
            ai={isDemo ? undefined : ai}
            onApiReady={(e) => {
              apiRef.current = e.api as unknown as AgStudioApi<Registry>;
              window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                  initialReadyRef.current = true;
                });
              });
            }}
            onErrorRaised={(e) => setError(e.errorDetails.join('; '))}
            onStateUpdated={(e) => {
              if (suppressNextUpdateRef.current) {
                suppressNextUpdateRef.current = false;
                return;
              }
              if (!initialReadyRef.current) return;
              if (presentation) {
                setSaved('Preview updated in this browser.');
                return;
              }
              if (isDemo) {
                try {
                  window.sessionStorage.setItem(DEMO_STUDIO_STORAGE_KEY, JSON.stringify(e.state));
                } catch {}
                setSaved('Preview updated in this browser.');
                return;
              }
              void api('studio/state', e.state)
                .then(() => setSaved('Report saved'))
                .catch(() => setError('Report changes could not be saved.'));
            }}
          />
        </AgStudioProvider>
      </div>
    </div>
  );
}

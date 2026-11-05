# ClassEquity architecture

A modular monolith: Next.js App Router / React / strict TypeScript / Tailwind; Zod at API boundaries; Drizzle on PostgreSQL. No queues, microservices, extra payment providers, or paid infrastructure. The local fallback is PGlite, PostgreSQL compiled to WASM, persisted under `.data/postgres`. Production requires a PostgreSQL URL.

## Ownership and boundaries

`src/lib/domain.ts` owns pure integer-cent mathematics. `src/db/schema.ts` defines 24 application tables. `src/server/services.ts` owns registration, consent, assistance, group freeze, invitations, sponsorship, and explicit demo scenarios. `src/server/payments.ts` owns logical provider operations and reconciliation. `src/server/data.ts` exposes separate teacher/aggregate, finance, and parent projections. Provider code lives under `src/server/integrations/`. `src/server/messaging.ts` is shared by the simulator and real Twilio webhook. The authenticated API dispatcher is `src/app/api/[...path]/route.ts`.

Browser code never connects to PostgreSQL or holds provider credentials. Type-only imports of server return types do not bundle server code. Authenticated Studio users receive the vendor's client-side licence as required by AG Studio; this is deliberately public vendor licensing material, not an API secret. No separate AG Grid Enterprise licence is inferred or registered.

## Records

Schools, users, memberships, sessions, trips (pricing tiers are versioned JSON within trip/snapshot), vendor quotations, registrations, parent consents, assistance allocations, sponsorship commitments, immutable pricing snapshots, obligations, payment operations, captures, full/partial refund operations, school contribution records, single-use invitations, WhatsApp conversations, message events, webhook inbox, AI assessment metadata, audit events, dashboard configurations, usage quotas. The migration ledger is separate.

Tenant ownership is checked through the actor's school and trip before object operations. Parent obligation ownership is checked separately. Finance is a distinct role: ordinary administrators and teachers cannot inspect aid mappings. Aggregate exports and Studio sources omit names and mappings. Synthetic demo and sandbox tenants are separate, including all financial operations.

## Financial definition

Applicable tier is the highest qualifying minimum. A snapshot freezes seat price and participating count. Family obligation = max(0, frozen seat price − approved support), sponsor obligation = exact voluntary commitment. Consent ceilings apply before freeze. Registration withdrawal before freeze changes estimates; the next freeze requires renewed consent if prices exceed a family's latest approved ceiling. Frozen registrations cannot be silently withdrawn or repriced: finance cancellation/refund review is required.

`required = frozen snapshot count × seat cents`. Before freeze, all figures are estimates. Verified same-mode capture gross, known processing/platform fees, completed refunds/reversals, pending-refund reservations and authorized school contributions form the net ledger. Unknown fees reserve the remaining capture and independently block readiness. Sponsor commitments are obligations, never an additional cash source. The deprecated bare `trip.reserve_cents` is preserved for compatibility but excluded from funding.

A school contribution has source, evidence/reference, finance authorizer, mode, positive integer amount, timestamp and an atomic audit event. Repeated source/reference pairs cannot duplicate treasury money or change the recorded amount. Sandbox treasury entries are finance attestations, separately reported from provider-confirmed sandbox captures. Demo contributions are synthetic. Existing unproven reserve values are not silently promoted to approved funds.

Readiness requires a frozen snapshot matching the registered population, positive seat count, sufficient net funding, no unknown fees, no unresolved payment/refund operation, and coverage for every seat. Registered, parent-paid, fully assisted, covered and unresolved seats are separate metrics. Coverage first assigns each family's available net contribution, bounded by total net funds; a single shared sponsor/treasury pool fills the remaining seat costs, ordinary seats before zero-parent-obligation seats. The pool is consumed once. Fully assisted status alone never confirms coverage. Outstanding parent/sponsor obligations remain separately reported even where common funds cover the trip.

The seeded shortfall remains 30 × $23 = $690, gross $553, known fees $20.70, net $532.30, gap $157.70. Fully funded demo creates only labeled synthetic captures and audited synthetic treasury contributions for fees/refunded costs. No provider call occurs.

## External operation safety

Claim → database commit → provider mutation → independent readback → version-guarded atomic ledger update. One logical operation per obligation; separate stable UUID create/capture keys; multiple separately identified partial/full refunds per capture. A durable irreversible capture marker prevents reconciliation from reopening a mutation. Row locks serialize refund balance reservations. Provider/network transactions cannot be made atomic with PostgreSQL; UNKNOWN never permits an automatic repeat. Readback recovers visible outcomes after process death and rejects stale versions/provider timestamps.

`src/server/paypal-webhooks.ts` authenticates the complete event, then extracts trusted lookup IDs. A durable hashed inbox with expiring leases supports duplicate, out-of-order and failed deliveries. Business outcomes always come from provider readback. The exact transition table and recovery limitations live in `FINANCIAL_WORKFLOW_CLOSURE.md`.

Studio's genuine Agent Framework uses a focused `directLlmRunner` agent with validated aggregate-summary and native-report presentation tools in the browser. Its Gemini boundary is authenticated server-side, rate-limited, and given only aggregate school finance. It can change report presentation; it has no payment, consent, pricing, or support-mutation tools. Uploaded quotes are untrusted extraction input and cannot directly activate a price policy.

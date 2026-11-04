# ClassEquity architecture

A modular monolith: Next.js App Router / React / strict TypeScript / Tailwind; Zod at API boundaries; Drizzle on PostgreSQL. No queues, microservices, extra payment providers, or paid infrastructure. The local fallback is PGlite, PostgreSQL compiled to WASM, persisted under `.data/postgres`. Production requires a PostgreSQL URL.

## Ownership and boundaries

`src/lib/domain.ts` owns pure integer-cent mathematics. `src/db/schema.ts` defines 23 application tables. `src/server/services.ts` owns registration, consent, assistance, group freeze, invitations, sponsorship, and explicit demo scenarios. `src/server/payments.ts` owns logical provider operations and reconciliation. `src/server/data.ts` exposes separate teacher/aggregate, finance, and parent projections. Provider code lives under `src/server/integrations/`. `src/server/messaging.ts` is shared by the simulator and real Twilio webhook. The authenticated API dispatcher is `src/app/api/[...path]/route.ts`.

Browser code never connects to PostgreSQL or holds provider credentials. Type-only imports of server return types do not bundle server code. Authenticated Studio users receive the vendor's client-side licence as required by AG Studio; this is deliberately public vendor licensing material, not an API secret. No separate AG Grid Enterprise licence is inferred or registered.

## Records

Schools, users, memberships, sessions, trips (pricing tiers are versioned JSON within trip/snapshot), vendor quotations, registrations, parent consents, assistance allocations, sponsorship commitments, immutable pricing snapshots, obligations, payment operations, captures, full-refund operations, single-use invitations, WhatsApp conversations, message events, webhook inbox, AI assessment metadata, audit events, dashboard configurations, usage quotas. The migration ledger is separate.

Tenant ownership is checked through the actor's school and trip before object operations. Parent obligation ownership is checked separately. Finance is a distinct role: ordinary administrators and teachers cannot inspect aid mappings. Aggregate exports and Studio sources omit names and mappings. Synthetic demo and sandbox tenants are separate, including all financial operations.

## Financial definition

Applicable tier is the highest qualifying minimum. A snapshot freezes seat price and participating count. Family obligation = max(0, frozen seat price − approved support), sponsor obligation = exact voluntary commitment. Consent ceilings apply before freeze. Registration withdrawal before freeze changes estimates; the next freeze requires renewed consent if prices exceed a family's latest approved ceiling. Frozen registrations cannot be silently withdrawn or repriced: finance cancellation/refund review is required.

`required = snapshot count × snapshot seat cents` (or current registered count × estimate before freeze). `net = completed capture gross − processing fees − completed refunds + documented school fee reserve`. Fully funded means net >= required, at least one seat, and no unresolved payment/refund operations. Commitments, approvals, pending and unknown captures never count as confirmed funds. Reversals contribute no available capture value. A partially refunded provider capture with unknown refund amount must stay unresolved, conservatively reserving its amount.

The seeded shortfall is 30 × $23 = $690; regular obligations $575, approved support $115; sponsor commitments $115 but only $70 captured. Regular captured funds $483, total gross $553; fees $20.70; net $532.30; gap $157.70. Fully funded simulation completes all obligations and explicitly simulates a school reserve covering fees. It never calls PayPal.

## External operation safety

Claim → commit → provider request → record/read back. One durable payment operation per obligation; one full refund operation per capture; stable request keys survive retries. There is no atomic transaction across families or across PostgreSQL and PayPal. Ambiguous outcomes remain UNKNOWN and require provider reconciliation. Refunds are compensation operations requiring finance authorization. PayPal webhook bodies trigger authenticated provider readback rather than becoming authoritative ledger values.

Studio's genuine Agent Framework uses a focused `directLlmRunner` agent with validated aggregate-summary and native-report presentation tools in the browser. Its Gemini boundary is authenticated server-side, rate-limited, and given only aggregate school finance. It can change report presentation; it has no payment, consent, pricing, or support-mutation tools. Uploaded quotes are untrusted extraction input and cannot directly activate a price policy.

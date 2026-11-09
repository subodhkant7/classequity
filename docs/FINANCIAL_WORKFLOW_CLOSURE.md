# Financial workflow closure

This document records an earlier implementation phase. See the [release manifest](RELEASE_MANIFEST.json) and [hosted verification](HOSTED_WEBHOOK_VERIFICATION.md) for current deployment and webhook status.

Baseline and starting HEAD: `62f9df8a093e9cf0e1954ef338264296ecdf7481`. Remote fetch found no intervening main changes. Branch: `codex/financial-workflow-closure`. Published history is preserved. Final commit/push/PR identifiers are reported in the delivery message; this document does not attempt a self-referential commit hash.

## Corrections and evidence

| Defect               | Confirmed root cause                                                                                                    | Correction                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Webhook verification | Zod stripped complete-event fields before PayPal postback verification; a crashed PROCESSING row could be stuck forever | Verify original full event first; byte/header bounds; event digest and unique identity; durable token-owned leases/attempts/retryable errors; provider readback only              |
| Optional fee data    | Missing optional fee threw before a valid completed capture was persisted                                               | Persist verified completion independently; explicit fee-known flag, pending UI and conservative reserve; malformed/mismatched fee accounting also remains pending                 |
| Synthetic reserve    | A bare mutable trip reserve silently closed demo funding                                                                | Exclude that legacy field; source/evidence/authorizer/mode/timestamp contribution ledger with atomic audit; separately label finance attestations and synthetic/provider captures |
| Capture race         | No-capture readback unconditionally overwrote CAPTURING with APPROVED                                                   | Irreversible capture marker/key; version CAS before atomic evidence writes; no UNKNOWN write retries; stale provider evidence and terminal-state regression guards                |
| Fully assisted seats | Confirmed-seat count counted only completed positive seat-payment operations                                            | Separate registered/parent-paid/fully-assisted/covered/unresolved metrics; consume actual aggregate net funding once, including zero-parent-obligation seats                      |

Tests are in `tests/financial.test.ts`, existing domain/service tests, `tests/e2e/app.spec.ts` and the independent-process harness. The browser pass also found/fixed stale selector labels after restoring saved Studio reports and ignored finance `?trip=` selection. Shared demo ledger assertions now compare the rendered net with the actual API projection instead of assuming existing records were never changed.

## Deterministic payment states

The executable pre-capture/readback guards are in `src/lib/payment-state.ts`; mutation claims and transactions are in `src/server/payments.ts`.

| State              | Entry / permitted recovery                                            | Mutation rule                                                                                                                      |
| ------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| CREATED            | Durable unique obligation operation                                   | Only state eligible to claim order creation                                                                                        |
| CREATING           | Conditional create claim committed before POST                        | No second create; successful ID/link → AWAITING_APPROVAL; definite rejection → FAILED; ambiguity → UNKNOWN                         |
| AWAITING_APPROVAL  | Valid recorded sandbox order; no verified buyer approval yet          | Existing checkout URL may be reused; readback can observe APPROVED, VOIDED→FAILED or unexpected completed-without-capture→UNKNOWN  |
| APPROVED           | Owned exact order GET confirms approval                               | CAS version/status plus NULL capture marker may claim CAPTURING exactly once                                                       |
| CAPTURING          | Durable timestamp and dedicated UUID committed before capture POST    | Never reset to APPROVED; capture evidence advances outcome; older than two minutes without a visible capture → UNKNOWN on readback |
| PENDING            | Verified capture exists but is pending                                | Readback only; excluded from available money and readiness                                                                         |
| COMPLETED          | Capture GET verifies ID/order association/USD/exact amount/completion | No repeat capture; missing fees remain a separate accounting issue; refund/reversal evidence may advance                           |
| UNKNOWN            | Ambiguous mutation/decode or inconsistent provider outcome            | Never permission to resubmit; GET recovery or merchant investigation; no new key, including beyond provider retention windows      |
| FAILED             | Definite rejection, voided order or failed capture evidence           | No automatic create/capture mutation retry; capture marker remains irreversible; readback may reveal an actual successful capture  |
| REFUND_PENDING     | Durable reserved refund or unverified external refund amount          | No capture; reserved refund balance cannot be reused; readback recovers refund IDs/statuses                                        |
| PARTIALLY_REFUNDED | Independently verified cumulative partial refund                      | No capture; additional independently identified refunds may claim only the remaining unreserved balance                            |
| REFUNDED           | Verified full refund (or provider capture readback says refunded)     | No capture/refund against exhausted balance; stale completion cannot restore funds                                                 |
| REVERSED           | Provider capture readback identifies reversal                         | No available capture money; retained known fees remain a cost; no recapture                                                        |

Pre-capture order status is observational, but a capture marker or a post-capture state cannot reopen a mutation. Capture evidence has separate monotonic terminal guards. Missing capture data never overwrites an already recorded capture outcome. Refund records separately use REQUESTED, PENDING, UNKNOWN, FAILED/CANCELLED and COMPLETED. A refund POST result is not completion evidence.

Operation versions advance on claims, reconciliation and refund ledger changes. A readback captures its initial version and must win a CAS inside the ledger transaction before changing captures/refunds. Competing work returns STALE_READBACK; retry only GET reconciliation. No database transaction is held over a network request. Provider timestamps reject older capture snapshots; known fees and completed refund amounts are retained when later responses omit them. There is no scheduled recovery worker; finance can reconcile manually and authenticated webhooks trigger the same function.

## Exact-cent accounting invariants

- Frozen seat cents and participating count are immutable. The latest accepted consent ceiling must cover the frozen price before order creation. Payers and finance are checked against school/trip ownership; parents may act only on their own obligation.
- Only matching-mode, evidence-bearing captures enter funding. Demo uses SYNTHETIC; sandbox requires PAYPAL_SANDBOX plus verified-at. Pending, failed and unknown captures are not cash. School contributions are separately attested treasury funds, never provider-confirmed payments.
- `required = frozen seat cents × frozen registered count`. Sponsor commitments are reported separately and never added to net cash in addition to their captures.
- `net = eligible capture gross − known fees − completed refunds/reversals − fee uncertainty reserve − pending refund reserve + approved same-mode school contributions`. Known fees remain costs after refund/reversal. Net may be negative. Unknown fee amounts are never assumed zero: the remaining capture is reserved and feePending independently blocks readiness.
- Fully funded requires a frozen snapshot matching current registered population, positive count, net ≥ required, zero unresolved payment/refund operations, zero fee-pending accounts and every seat covered.
- Parent-paid means positive parent obligation fully met by verified/synthetic same-mode gross remaining after refunds. It does not imply all seat costs/fees are funded. Fully assisted means zero parent obligation, not free vendor cost.
- Seat coverage assigns each family's available net to its seat, bounded by total net; a single remaining common pool then fills seat deficits, ordinary seats before fully assisted seats. No sponsor amount is counted twice. Outstanding obligations remain a separate metric even when common funds cover the trip.
- Every school contribution stores positive cents, source, evidence/reference, authorized finance user, mode and timestamp. Its audit entry commits atomically. Source/reference identity is idempotent; changing an already recorded reference's amount fails. Existing legacy reserves are preserved but do not count. Treasury attestations are not independent bank verification, and no real funds are invented.

## Database migration and preservation

The existing dedicated `classequity` database was inspected before changes: initial migration, 31 operations, 25 captures and no refunds. `0001_natural_skaar.sql` adds contribution records, capture provenance/fee knowledge/readback timestamps, operation version/capture claims, webhook digest/leases/retries and refund client identities. Existing refund client IDs are backfilled before NOT NULL enforcement. Existing demo capture provenance is backfilled SYNTHETIC; old sandbox evidence defaults UNVERIFIED and needs actual readback. Legacy attempted sandbox captures receive a conservative irreversible marker.

The only removed constraint is the old one-refund-per-capture uniqueness constraint, enabling multiple partial refunds. No table, financial record or legacy reserve is deleted. `scripts/migrate.ts` allows that exact reviewed constraint replacement and still rejects all other DROP/TRUNCATE text. `0002_gorgeous_thanos.sql` adds pending refund reserves and refund verified-at. The final schema has 24 application tables plus the migration ledger. All three migrations applied to the existing database and checksum replay succeeded. Generated Drizzle snapshots/journal are committed.

The independent harness creates its own temporary `ce_verify_...` schema; all migration foreign keys are scoped to it. Application/public records are untouched. One initial database connection reset left a temporary schema, which was explicitly cleaned up. Later complete runs passed and cleaned up. The normal app cannot select a test schema outside NODE_ENV=test with a restricted schema name.

## Concurrency and injected failures — LOCALLY TESTED

`npm run test:financial:concurrency` ran independent Node processes with separate PostgreSQL pools against an isolated schema in the existing dedicated PostgreSQL service. It used only a loopback fake provider; no PayPal mutation occurred. Six scenarios passed, each with one provider mutation:

1. Two capture workers, reconciliation while the first mutation is in flight, then a duplicate request.
2. No-capture read started before another worker's capture claim; stale write rejected.
3. Capture process killed after provider mutation; another process recovered by GET.
4. Network loss with no visible provider result; independent second worker did not retry the mutation.
5. Competing partial refunds reserve balance and reuse duplicate identity.
6. Refund process killed after mutation; another process recovered provider ID via order/custom identity and verified completion.

Evidence: `financial-concurrency-evidence.json`. The harness also checks persisted UUID keys fit the documented 38-byte recommendation. CI now runs the harness against an ephemeral PostgreSQL 17 service with a local fake provider; it requires no PayPal/Render credentials.

The durable claim deliberately prefers avoiding duplicate mutations over automatic recovery: a crash between claim and provider submission can strand an unexecuted claim. Unknown creates with no order ID and refunds invisible to both order readback and notifications require merchant investigation. No supposedly safe timeout duration authorizes replay.

## Provider verification and deployment boundary

**SANDBOX VERIFIED:** PayPal OAuth and original $32 order creation. At the initial closure read, the original order matched the obligation, was PAYER_ACTION_REQUIRED and had zero captures. A later GET returned INVALID_RESOURCE_ID; it is now unavailable for checkout. That response does not establish a captured or unpaid outcome. Existing records/identities were preserved.

`financial-provider-evidence.json` records redacted read-only order and sandbox webhook configuration observations. No webhook is registered (configuration read HTTP 200). Render inspection found no ClassEquity web service/canonical public HTTPS URL. No placeholder callback, new hosted resource, paid plan or production finance deployment was created. Database migrations are applied; the website is not deployed.

**SANDBOX VERIFIED — authorized lifecycle:** the requested replacement obligation was **Avery Sandbox Closure Example — Financial closure verification, USD 1.00**. The user confirmed human buyer approval and explicitly authorized one capture, a duplicate-request check and one full refund up to $1. When verification began, the payment was already completed in PayPal and ClassEquity. No new charge was initiated. Independent capture GET verified USD 1.00, completion and order association. Repeating the authenticated ClassEquity capture endpoint retained the same single provider capture and single local record.

The authenticated finance endpoint issued one full USD 1.00 refund with its durable identity. Independent PayPal refund GET and ledger readback confirmed COMPLETED, refunded cents 100 and no pending refund reserve. The operation is REFUNDED. PayPal retained a verified $0.54 fee: actual AG Studio grid refreshes showed $0.46 net after capture and **−$0.54 net after refund**, with parent-paid count falling from 1 to 0 and covered seats staying 0. No invented treasury contribution closed the gap. Evidence: `financial-lifecycle-evidence.json` (no provider IDs/URLs/credentials). Actual partial, rejected, pending and unknown refund scenarios remain provider-fake tests; no additional real sandbox refunds were issued.

**BLOCKED:** genuine signed public webhook delivery and hosted HTTPS deployment. No buyer password or approval was automated. The historical preparation file records the earlier awaiting-approval state; it is superseded for final financial outcomes by the lifecycle evidence. Newly created future orders retain their trip in return/cancel URLs.

For hosted verification, deploy the tested private branch to an authorized existing/free ClassEquity service, verify its canonical HTTPS URL, configure its sandbox credentials and database privately, register that exact `/api/webhooks/paypal` URL with the sandbox app, store PAYPAL_WEBHOOK_ID privately, then receive genuine events and verify duplicate business effects/readback. No such deployment or delivery is claimed here.

## Reproduction and release checks

1. Install from lockfile; configure ignored environment privately. Run `npm run db:migrate` against the dedicated database (or a fresh isolated local PGlite path), then seed only if needed. Seeding never resets existing data.
2. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, `npm run secrets:check` and `npm run integrations:check`.
3. For independent-process verification, point DATABASE_URL at a dedicated test PostgreSQL database named classequity and run `npm run test:financial:concurrency`. The harness creates/removes only its unique temporary schema and uses a fake provider.
4. `npx tsx scripts/inspect-financial-state.ts` performs read-only provider inspection. `scripts/prepare-financial-checkout.ts` is a controlled order-creation preparation command under the closure request; it never captures/refunds, never resets the original order and saves its handoff privately. Do not run repeatedly to bypass UNKNOWN.
5. Buyer approval and authorized capture/refund are separate steps through the authenticated parent/finance application. No approved URL/token, provider IDs, raw personal details or credentials belong in committed evidence.

Production builds use Next's supported Webpack compiler because Turbopack's CSS build subprocess repeatedly failed to bind its internal port in this environment. This is a compiler fallback, not an application architecture change. Shared-password sandbox finance access, treasury attestation controls, audit tamper resistance, recovery scheduling/monitoring, hosted TLS/callback verification and broader provider edge-case testing remain release prerequisites. No main merge or production finance release is authorized by passing local tests alone.

## Final local verification results

| Check                                 | Result                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                   | PASS                                                                                                    |
| `npm run lint`                        | PASS                                                                                                    |
| `npm test`                            | PASS — 39 tests, 4 files                                                                                |
| `npm run test:financial:concurrency`  | PASS — 6 independent-process PostgreSQL scenarios, local fake provider                                  |
| `npm run build`                       | PASS — supported Webpack compiler                                                                       |
| `npm run test:e2e`                    | PASS — 5 Chromium flows, including real Studio chart/grid and assisted coverage                         |
| `npm run secrets:check`               | PASS — zero configured credential/approval-URL matches                                                  |
| `npm run integrations:check`          | PASS — PayPal OAuth 200, Twilio read 200, Gemini generation 200; no capture/refund/message              |
| Dedicated database migration + replay | PASS — 3 migrations; preserved application records                                                      |
| PayPal order/capture/refund GET       | SANDBOX VERIFIED — one USD 1.00 capture, duplicate kept one capture, one completed full USD 1.00 refund |
| Genuine public signed delivery        | BLOCKED — canonical HTTPS deployment and webhook registration required                                  |

All application changes are IMPLEMENTED and LOCALLY TESTED. Database schema is applied to the existing hosted database. No ClassEquity website is DEPLOYED and no live financial operation occurred.

CI initially exposed a pre-existing lockfile placement mismatch for esbuild/picomatch under normal peer resolution, while the local machine defaulted to legacy peer resolution. The lockfile was regenerated with CI's normal resolution. Comparing package-name/version sets before and after showed no additions, removals or version changes; only placement/metadata changed. `npm ci --dry-run --legacy-peer-deps=false --ignore-scripts` passed. Final remote CI status is reported with the PR handoff.

The authorized real-provider script is `scripts/verify-sandbox-lifecycle.ts`. It requires explicit `CE_AUTHORIZED_SANDBOX_CENTS=100` and `CE_AUTHORIZED_FULL_REFUND=true`, validates the exact fictional manifest and sandbox/localhost environment, uses authenticated ClassEquity endpoints and independent SDK readbacks, and checks actual AG Studio rendering. Completed lifecycle evidence makes later invocations return without financial requests. Do not reuse the authorization for another obligation or rerun a mutation to resolve UNKNOWN. The completed test does not authorize additional orders, charges or refunds.

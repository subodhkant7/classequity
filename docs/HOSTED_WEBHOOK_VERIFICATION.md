# Hosted deployment and PayPal webhook verification

**DEPLOYED — SANDBOX HOSTED WEBHOOK VERIFIED.**

Application: https://classequity.onrender.com

Registered endpoint: https://classequity.onrender.com/api/webhooks/paypal

Branch: `codex/hosted-webhook-verification`; [draft PR #3](https://github.com/subodhkant7/classequity/pull/3), targeting the experience branch. Repository remains private; PR #1 and #2 remain unmerged. Starting baseline: `a0db0b0a8aae9e2a908ac91ff5150538fb3cea11`.

The financial verification ran on deployed receiver commit `03dafab57ed17b0de9d501a2228904ea73373d09`. Final public-copy release commit and exact final Git/CI revisions are recorded in the delivery report and deployment evidence. No financial domain formula, provider state transition or schema migration was changed to obtain this result.

## Genuine verification outcome

The user manually approved **Morgan Sandbox Webhook Example — Hosted webhook verification**, then explicitly authorized exactly one USD 1.00 sandbox capture, an idempotent duplicate-request check and one full refund up to USD 1.00. Buyer login and approval were never automated. The prior financial-closure transaction was not reused or modified.

| Gate                              | Observed result                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Real HTTPS application            | PASS; actual Render host, database-ready health check and deployed commit readback                                                    |
| Existing application              | PASS; public homepage/labs/tour/technology, role-protected workspace, genuine native Studio charts/grids                              |
| Public tour isolation             | PASS; zero application API calls across six chapters; local synthetic state only                                                      |
| Existing database                 | PASS; existing PostgreSQL 17, three unchanged migrations, no startup migrations or seed                                               |
| Restart persistence               | PASS; original sandbox ledger fingerprint unchanged across deployment and explicit restart                                            |
| Correct sandbox registration      | PASS; existing REST application credentials, exact HTTPS endpoint, independent registration GET                                       |
| Genuine approval event            | PASS; CHECKOUT.ORDER.APPROVED, PayPal signature verified, PROCESSED inbox, exact operation and correct webhook fingerprint            |
| Genuine capture event             | PASS; PAYMENT.CAPTURE.COMPLETED, verified signature, PROCESSED inbox, independent COMPLETED readback                                  |
| Genuine refund event              | PASS; PAYMENT.CAPTURE.REFUNDED, verified signature, PROCESSED inbox, independent REFUNDED readback                                    |
| Capture and duplicate request     | PASS; one provider capture and one local capture after the duplicate request; no second charge                                        |
| Full refund                       | PASS; one completed USD 1 refund, zero pending-refund reserve, retained USD 0.54 fee                                                  |
| Live Studio after capture         | PASS; USD 1 gross, USD 0.54 fee, USD 0.46 net, one parent-paid seat; exact native grid cells observed                                 |
| Live Studio after refund          | PASS; USD 1 refunded, −USD 0.54 net, zero parent-paid/covered seats; exact native grid cells observed                                 |
| Genuine event resends             | PASS; approval, capture and refund replays reached the actual receiver and passed its signature/digest-guarded duplicate branch       |
| Older capture replay after refund | PASS; already-seen completed-capture event replay did not regress REFUNDED state or repeat settlement                                 |
| Financial ledger after replays    | PASS; version 12→12, captures 1→1, refunds 1→1, reconciliation audits 3→3 and identical complete ledger fingerprint                   |
| Prior USD 1 evidence              | PASS; exact original operation/capture/refund fingerprint unchanged: c27a2eb43767fa2a0826a98d68e29e299bb912cde75062e481dfe22ac9a5347c |

All three genuine events have one durable inbox row, one processing attempt and a reconciliation audit with the received-body digest, event fingerprint, correct configured webhook fingerprint, exact internal operation association and independent readback status. No mock simulator was used. The resend endpoint's HTTP 202 acceptance is recorded separately from actual live receiver receipt. Provider-side HTTP delivery status was not available and is not invented.

## Redacted evidence

- `hosted-financial-lifecycle-evidence.json`: authorization, provider capture/refund readback, duplicate-request result, genuine event processing and actual Studio observations.
- `hosted-financial-redelivery-evidence.json`: real resend requests, actual receiver receipts and identical before/after ledger state.
- `hosted-approval-event-evidence.json` and `hosted-approval-resend-evidence.json`: earlier nonmonetary approval/signature/redelivery proof.
- `hosted-deployment-evidence.json`: hosting, configuration, persistence, source and verification boundaries.

Provider IDs, approval URLs, buyer data, transport signatures and raw webhook bodies are not committed. Screenshots stay in ignored `output/playwright/hosted/financial-captured-studio.png` and `financial-refunded-studio.png`. Exact net cells and absence of visible loading indicators were checked before capture.

PayPal accepted the complete received event through its normal verify-webhook-signature endpoint. Inbox/audit digests agree, and genuine independently signed replays passed exact digest checks. PayPal management GET representations had different digests and were not assumed identical to transport bodies or substituted into signature verification. Signature checking was never weakened.

## Release and receiver contract

The user-confirmed My Workspace has no project containers. One free Singapore Node web service uses the existing `classequity-db` through its private connection. Auto-deploy and PR previews are off. `render.yaml` is the reviewed configuration reference; no active Blueprint sync creates a database. Start is only `npm start`. Free Render has no pre-deploy jobs, so `npm run release:check` is an explicitly read-only build gate for sandbox configuration, canonical HTTPS origin, database identity, exact migration checksums and existing fictional schools. Restart never migrates or seeds. `/api/health` checks database connectivity and returns no private values.

HOSTED_RESTRICT_PUBLIC_AI=true keeps freely accessible demo roles away from cloud Gemini. Grounded local parent answers and recorded tour examples remain available. Restricted sandbox roles retain the authenticated Gemini integration. Twilio credentials and the unconfirmed public-use Studio trial are not provisioned. Real evaluation components retain vendor notices and no new licence rights are asserted.

The streamed request and transport headers are bounded. Invalid signatures return 401; verification outages return retryable 503. Only authenticated events enter the durable inbox. Payload collisions return 409; active leases, unsupported financial events, unmatched operations and readback failures are not falsely acknowledged as reconciled. Expiring token-owned leases support recovery. Financial processing awaits authoritative provider readback and atomic ledger reconciliation, then atomically completes the inbox and redacted audit. A completed authenticated duplicate returns 2xx without another ledger settlement. Its application log contains only the event fingerprint and inbox status. No fire-and-forget work runs after the response.

Subscribed supported types: CHECKOUT.ORDER.APPROVED; PAYMENT.CAPTURE.COMPLETED, PENDING, DECLINED, DENIED, REFUNDED, REVERSED; PAYMENT.REFUND.PENDING and FAILED. Live proof covers APPROVED, COMPLETED and REFUNDED. Decline, reversal, missing-fee, unknown/unmatched, collision, lease-crash and unseen out-of-order paths retain automated coverage; they were not all induced at the real provider. The live older-event replay used an already-seen capture event, which is distinguished from an unseen out-of-order notification.

## Verification and remaining limits

Local typecheck, lint, 60 unit/service tests, build and secret scan pass. CI retains six independent-process financial concurrency scenarios against ephemeral PostgreSQL and all 12 browser flows against the built production server. The complete nine-check hosted run covered 390px/reduced motion, authorization/CSRF/secure cookies, tour isolation and native Studio. Targeted genuine Studio refreshes were additionally observed after capture and refund. Exact final CI result is available through [PR #3 checks](https://github.com/subodhkant7/classequity/pull/3/checks) and the delivery report.

A readable private PostgreSQL custom-format backup was created before deployment; restoration is not yet tested. The free database expires **December 4, 2026 at 20:48 UTC / December 5 at 02:18 IST**. Preserve the private backup before expiry; no paid upgrade or replacement database was created. The preservation inspector selects the exact historical operation identity, so the second transaction's identical USD 1/54-cent outcome cannot contaminate the original-evidence fingerprint.

Free hosting is not an always-on webhook guarantee. Natural idle spin-down/wake was not separately certified, although eventual real resend receipts were observed. PayPal retries and genuine resends remain necessary; there is no scheduled recovery worker or raw-payload retention. Shared-password sandbox identity, the existing broad external database IP allowlist, vendor evaluation notices, unverified live WhatsApp delivery and untested hosted Gemini generation remain hackathon limitations. No production financial readiness or compliance certification is claimed.

No additional capture/refund is authorized by this completed check. The new operation is fully REFUNDED; any future financial check requires its own exact-amount authorization. No live payment, live message, paid resource upgrade, PR merge or repository publication occurred.

Official contracts: [PayPal webhook integration](https://developer.paypal.com/api/rest/webhooks/rest/), [event names](https://developer.paypal.com/api/rest/webhooks/event-names/), [webhook management](https://developer.paypal.com/api/webhooks/v1), [Render free services](https://render.com/docs/free), [health checks](https://render.com/docs/health-checks), [deploy lifecycle](https://render.com/docs/deploys).

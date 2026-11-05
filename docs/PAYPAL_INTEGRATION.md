# PayPal sandbox integration

`src/server/integrations/paypal.ts` uses the installed APIMatic-generated official `@paypal/paypal-server-sdk` 2.5.0. Production mode is never selected. Orders and Payments use typed controllers, cached OAuth, a 20-second timeout and no SDK mutation retries. The webhook verification endpoint uses a narrow authenticated REST adapter.

## Owned obligation and checkout

The server checks tenant/payer ownership, positive integer cents, a frozen matching snapshot and latest accepted parent consent. Browser prices are ignored. A unique operation and UUID request key commit before order creation. Only CREATED may claim CREATING. Failed, in-progress or UNKNOWN creations are not automatically resubmitted. A missing order ID after an ambiguous create requires merchant investigation, including outside PayPal's idempotency retention period.

The approval URL must have the exact sandbox PayPal HTTPS origin. Parent checkout reuses a recorded awaiting-approval order. A human signs in and approves with their sandbox personal account; the application never receives or automates buyer credentials. Captures and refunds require the separately authorized test steps. A returned approval URL or HTTP success does not prove a payment.

## Capture and readback

The validated order must have its expected ID, one purchase unit, obligation custom ID, USD currency and exact frozen amount. Its unique capture ID must match capture GET; the related order ID must also agree when present. Association is established by the capture's membership in that validated order, even when the optional supplementary order field is absent. Multiple unexpected captures fail integrity validation.

Before capture, a conditional update records CAPTURING, a dedicated UUID capture key and `capture_requested_at`. That marker is irreversible: no readback can reopen APPROVED for a second mutation. UNKNOWN always means readback/investigation. A crash after the claim but before the provider call can leave an unexecuted claim; availability is deliberately sacrificed for safety. Reconciliation cannot infer that retrying a write is safe. A CAPTURING claim older than two minutes with no visible capture becomes UNKNOWN. There is no automated background reconciler.

All readbacks use operation versions. The version compare-and-swap must win inside the same transaction before capture/refund evidence is written. A competing mutation/readback invalidates older work. Provider update timestamps reject older capture evidence; completed/partially refunded/refunded/reversed states and known fees cannot be downgraded by a lagging response. STALE_READBACK is retriable read-only work.

## Payment completion versus fee knowledge

The SDK marks `sellerReceivableBreakdown` and `paypalFee` optional. Valid completed captures persist as COMPLETED even without them. Capture identity, amount, provider provenance, readback time, fee knowledge and funding availability are separate fields. `fee_known=false` makes the stored zero fee a placeholder, never an assertion that the fee is zero. UI receipts say “Accounting pending.” Platform fees are included when supplied in USD. Missing/foreign fee data reserves the remaining capture and blocks readiness. Later readback can resolve fees without repeating capture.

Demo captures have SYNTHETIC provenance. Only matching-mode PAYPAL_SANDBOX captures with a readback timestamp enter sandbox totals. School treasury attestations are separately labeled; they are not PayPal captures. No record is described as a live payment.

## Full and partial refunds

Only finance can authorize a refund against an owned verified capture. Each refund has an immutable requested amount, unique client identity, UUID provider request key and authorizer. Operation/capture row locks reserve the remaining balance before any request; pending and unknown amounts cannot be refunded again. Reusing a client identity returns its existing operation; changing its amount fails. Multiple partial refunds and a remaining-balance refund are supported.

The refund POST carries its amount and the local claim ID as `customId`. A POST result identifies a refund; independent GET checks ID, USD amount and capture association before completion enters the ledger. Completed refund evidence cannot regress to pending. Reconciliation discovers refunds listed on the order and matches `customId`, recovering a lost response/provider ID after process death. An authenticated refund notification can supply an additional ID for verified readback. If neither order readback nor a verified notification reveals that ID, UNKNOWN stays reserved and requires merchant investigation. No blind refund replay exists.

External full refunds/reversals consume the capture balance. External partial refunds with unavailable amounts reserve the remaining capture and block readiness. Known fees remain deducted after refunds/reversals.

## Signed webhook inbox

`POST /api/webhooks/paypal` bounds streamed UTF-8 body bytes to 250,000, requires JSON and validates bounded PayPal transport headers, certificate URL, algorithm and transmission time (three days past/five minutes future). The **complete original parsed event** goes to PayPal's verification API before any business schema extracts fields. No raw request/body/headers are logged or persisted.

A canonical full-event SHA-256 digest binds provider/event ID. Identical processed deliveries are acknowledged without reapplication; an identity collision fails. Durable two-minute processing leases, ownership tokens, attempts and retryable error records recover worker crashes. A failure retains its inbox record; no delete-and-forget path exists. Concurrent live claims return 503. Unknown financial events are retained for investigation/retry, not marked successfully reconciled. Unrelated authenticated event types are ignored explicitly. Events trigger fresh order/capture/refund readback, never direct financial state updates from event names.

## Actual verification boundary

See `financial-provider-evidence.json`, `financial-concurrency-evidence.json` and `FINANCIAL_WORKFLOW_CLOSURE.md`. OAuth and original order creation are genuinely verified; captures/refunds and genuine signed public delivery require separate evidence. Provider-fake tests are not PayPal transaction proof. Render has no ClassEquity web service; no callback was registered against localhost or a placeholder.

Contracts: [PayPal idempotency](https://developer.paypal.com/api/rest/reference/idempotency/), [Payments v2](https://developer.paypal.com/api/payments/v2), [webhook verification](https://developer.paypal.com/api/rest/webhooks/rest/). Installed model/controller sources and `paypal-plan.md` establish exact SDK property names.

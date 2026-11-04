# PayPal sandbox integration

Implementation: `src/server/integrations/paypal.ts`, `src/server/payments.ts`, and the authenticated API dispatcher. APIMatic-generated `@paypal/paypal-server-sdk` 2.5.0 supplies typed Orders/Payments controllers, serializers, OAuth caching and error classes. The implementation never selects Production. The narrow REST extension covers webhook verification, which these controllers do not expose.

## Browser journey

Sign in to the sandbox workspace with the privately configured ADMIN_PASSWORD. Create a trip or use the sandbox science trip. Issue a single-use parent invitation. In a separate browser session, redeem it, register a fictional student, and consent to the current price. The school freezes exact pricing after reviewing any finance-only support allocations. The parent opens My payments, clicks PayPal sandbox checkout, and a server-created exact USD order redirects to PayPal. A human signs in with a personal sandbox buyer, approves, returns, then clicks Finalize approved payment. The server verifies the order's amount/currency/custom ID against the owned immutable obligation before capture, then reads the capture back. The finance desk can reconcile and authorize a full refund; refund completion is read back separately.

No stored sandbox buyer password is read or automated. No live financial operations exist. Demo checkout calls only the labeled simulator.

## Operation safety

One unique operation per obligation is stored before a provider call. Create and capture are claimed with conditional status updates. Create uses the stored request key; capture uses that same logical identity with a stable suffix. Provider timeouts and decode/5xx failures remain UNKNOWN. Capture catch attempts readback before surfacing uncertainty. Unknown creates can retry the same key within six hours; never change identities after ambiguity. CREATING/CAPTURING after a process crash require finance investigation; there is no autonomous background reconciler in this initial pass. Admins explicitly reconcile from the finance desk and verified webhooks trigger readback.

Captures must match amount/currency, order custom ID, and related order where supplied. Merchant OAuth scope keeps the app first-party. Pending captures do not count; absent processing fees keep a payment unresolved. Full refund claims are unique per capture. A lost refund response without a provider refund ID requires merchant investigation; it cannot silently create a fresh refund. External partial refunds without a verified amount are conservatively reserved and remain unresolved.

## Webhooks

After public HTTPS exists, register `/api/webhooks/paypal` in the same sandbox app and save PAYPAL_WEBHOOK_ID. Subscribe to applicable capture completion/pending/denial/refund/reversal events and refund completion/pending/failure events. No webhook is registered against localhost or a placeholder. The endpoint verifies PayPal transmission headers with PayPal's verification API, uses a three-day replay window and unique inbox event ID, then reads the provider resource. Prices or payment states from an unsigned browser/webhook cannot update the ledger. Unmatched verified events do not create obligations.

## Evidence and remaining verification

`docs/integration-evidence.json` records OAuth 200; no capture or refund has been executed. `scripts/sandbox-order.ts` is prepared for a genuine order-creation smoke test. Automatic approval review initially required specific approval. The user approved it, and a genuine $32 USD sandbox order was then created, awaiting human approval. See `docs/sandbox-order-evidence.json`. No capture occurred. Buyer-approved purchase, capture, refund, webhook delivery, merchant/payer edge cases, and external partial-refund readback remain unverified. See the final implementation report for the current status; never present seeded SIM-* IDs as PayPal transactions.

Contracts: https://developer.paypal.com/docs/api/orders/v2/ ; https://developer.paypal.com/docs/api/payments/v2/ ; https://developer.paypal.com/api/rest/webhooks/rest/ ; APIMatic contract sheet `paypal-plan.md`.

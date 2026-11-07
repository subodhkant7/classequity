# Hosted deployment and PayPal webhook verification

Release phase started November 7, 2026 from `a0db0b0a8aae9e2a908ac91ff5150538fb3cea11`, on `codex/hosted-webhook-verification`. PR #1 and #2 remain unmerged. This document distinguishes hosting, registration, signature verification and ledger reconciliation; none implies the others.

## Preflight

The user confirmed **My Workspace**. The workspace has no project containers and initially had no ClassEquity web service. Existing `classequity-db` is available, PostgreSQL 17, free plan, Singapore, with three applied migrations and the two expected fictional workspaces. Its expiration is **December 4, 2026 at 20:48 UTC**. No new database or paid resource is required or authorized.

Read-only inspection found the original sandbox USD 1 capture, USD 1 refund and retained USD 0.54 fee intact. A private local PostgreSQL custom-format backup was created and its archive directory verified. It is ignored under `.data/hosted/`, mode 0600, and must never be committed. The initial one-way fingerprint of sandbox operation/capture/refund rows is stored privately for comparison after deployment and restart. A backup's existence is not a tested restoration or an indefinite preservation guarantee; preserve/export it privately before the free database expires. Free Render PostgreSQL has no managed backups.

## Release contract

- One free Node web service, Singapore, linked to this dedicated branch; auto-deploy and PR previews off. Existing private repository and database remain unchanged.
- Start is `npm start`. No startup migration or seed. Free Render has no pre-deploy jobs, so `npm run release:check` is a **read-only build gate** that verifies sandbox settings, canonical HTTPS origin, dedicated database, exact migration checksums and existing fictional workspaces. Schema changes require separate review and controlled execution; a failed check stops the build.
- `/api/health` checks database connectivity and returns a sanitized readiness state and deployed commit, with no configuration values. Failure returns 503. Render's five-second readiness request deadline still applies if database connectivity stalls.
- `HOSTED_RESTRICT_PUBLIC_AI=true` prevents the freely accessible demo roles from invoking cloud Gemini. Local grounded answers and the recorded tour remain available. Password-protected sandbox roles retain genuine Gemini integration. Public demo payments/messages use existing simulation paths. Twilio credentials are not provisioned for this phase.
- The existing client-side Studio trial is not copied to hosting without a verified public-use licence scope. Genuine evaluation components can still render with vendor evaluation notices; no new licence rights are asserted.

## Webhook contract

Register only the Render-assigned HTTPS `/api/webhooks/paypal` URL with the existing **sandbox REST app**. Inspect registrations first and reuse an exact appropriate registration. Compare the app's available event types with `src/lib/paypal-webhook-events.ts`; Payments v2 uses `PAYMENT.CAPTURE.DECLINED`, while `DENIED` belongs to the older Payments v1 vocabulary. Include supported approval, capture completion/pending/decline/refund/reversal and refund pending/failed events. Store the identifier privately, then deploy the saved environment.

The complete original parsed event reaches PayPal's verification API before business projection. Streamed body and transport-header bounds, sandbox certificate hosts and transmission-time checks are retained. A verification-service outage returns retryable 503; an invalid signature returns 401. Only authenticated events enter the durable inbox. Identical completed retries return 2xx without another readback or financial effect; colliding event bodies return 409. A two-minute token-owned lease allows recovery after a process dies. Unsupported financial and unmatched events remain RETRYABLE and return 503; authenticated unrelated events may be explicitly IGNORED.

Financial processing awaits independent provider readback and ledger reconciliation. The inbox PROCESSED transition and a redacted audit record are transactional. The audit records event/payload/webhook fingerprints, event type, exact internal operation association and readback status. No raw event body, transmission signature, approval link or buyer identity is stored in evidence. Ledger settlement before a crash is safe to repeat; version checks and natural identities retain financial idempotency. No work is deferred after the HTTP response.

Free service idle spin-down and database maintenance can cause delivery failures. PayPal retries non-2xx deliveries up to 25 times over three days; the operator can request a genuine resend after availability is restored. There is no guaranteed always-on receiver or scheduled recovery worker. The inbox intentionally does not retain raw payloads; recovery of RETRYABLE events uses an authenticated provider resend/manual investigation, not invented state.

## Evidence status

**PREPARED — deployment and genuine signed delivery are not yet claimed at this commit.** Final hosted evidence will be added after observation. Mock simulator events and provider-fake automated tests never count as PayPal signature proof. The prior USD 1 transaction authorization is consumed and this phase will not alter it. If a new transaction is needed, all independent setup must finish before a new exact-amount capture/refund authorization and manual buyer approval checkpoint.

Official contracts consulted: [Render free services](https://render.com/docs/free), [deploy lifecycle](https://render.com/docs/deploys), [health checks](https://render.com/docs/health-checks), [private networking](https://render.com/docs/private-network), [PayPal webhook integration](https://developer.paypal.com/api/rest/webhooks/rest/), [event names](https://developer.paypal.com/api/rest/webhooks/event-names/), [webhook management API](https://developer.paypal.com/api/webhooks/v1).

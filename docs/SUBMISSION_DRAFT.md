# ClassEquity — Devpost draft

**Tagline:** Every child belongs on the trip. Every payment is accounted for.

## Inspiration

A class trip should be a shared opportunity. Schools often reconcile spreadsheets, group-message replies, informal sponsorship promises and payment screenshots while protecting families who need help. Group discounts make the price itself uncertain. We wanted a workflow in which inclusion and financial correctness reinforce each other.

## What it does

ClassEquity coordinates school activities with tiered group pricing, parent registration and consent, private support requests, finance-approved assistance, voluntary sponsorship, exact final obligations and PayPal sandbox checkout. It distinguishes commitments and registrations from confirmed captures, deducts provider fees/refunds, and refuses to claim funding readiness while a gap or unresolved operation remains. Teachers see safe aggregate views; only finance personnel see support-recipient mappings.

## How we built it

Next.js App Router, React, strict TypeScript, Tailwind, PostgreSQL, Drizzle, Zod, integer-cent domain calculations and durable operation identities. The existing free Render PostgreSQL instance stores separate fictional demo and sandbox tenants. Vitest covers core invariants and Playwright checks navigation, boundaries, actual sponsor rendering and responsive layout.

**AG Studio / AG Grid:** actual AG Studio v3 React component, editable report pages, native analytical widgets, custom Group Unlock/Funding Assurance/Payment Integrity widgets and the real Agent Framework. Gemini is connected through an authenticated server adapter. Analytics receives only permitted aggregates and cannot execute payments or approve assistance.

**PayPal:** APIMatic-generated official Server SDK implements sandbox Orders v2 create/capture and Payments v2 readback/refunds, with durable logical keys, provider verification and compensation states. A narrow official-spec adapter verifies webhook signatures. A human completes buyer approval.

**Twilio WhatsApp:** genuine typed adapter, signature-verified inbound/status endpoints, deduplication, paired opt-in, school-grounded English/Hindi information and expiring secure browser links. A clearly labeled simulator exercises the same conversation service.

**Gemini:** account model discovery, verified Flash Lite text generation, multilingual parent information, schema-validated multimodal quotation extraction with mandatory human review, and Studio tool-call translation for financial explanation and report presentation.

**APIMatic:** installed PayPal/Twilio Context Plugins v0.4.1 and used their published SDK maps, auth/retry/error guidance and API operation contracts in implementation. The official PayPal Server SDK used in production code is APIMatic-generated. Differences from the plugins' Git-source SDKs are explicitly documented.

## What is innovative

The core outcome is a consent-bounded group-clearing workflow with confidential support and net funding assurance, rather than a payment screenshot tracker. Inclusion does not require exposing family circumstances to teachers, sponsors or AI. A beautiful funding percentage is tied to exact capture/fee/refund states, not pledges.

## Challenges and limitations

Sandbox provider integrations are implemented; OAuth and Twilio account reads are verified, Gemini generation is verified. Buyer-approved captures, refunds and public webhook delivery require remaining human/external setup. All students, historical examples and demo captures are synthetic; there is no real-school impact measurement. The sandbox uses shared administrator access pending a real identity provider and independently provisioned finance staff. No live payments, escrow claims, nonprofit-processing claims or public source release are part of this submission.

## Next

Finish human sandbox transaction/webhook verification, provision production identity, audit authorization and provider failure cases, polish accessibility/responsiveness, review free-host limits and dependency advisories, and verify AG Studio trial rights for judging. Keep this as a draft until provider evidence and the final implementation report are checked.

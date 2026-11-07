# ClassEquity

**Every child belongs on the trip. Every payment is accounted for.**

School activity coordination with consent-bounded group pricing, private support, verified sandbox accounting and genuine editable financial intelligence. Built for the PayPal AI Hackathon 2026; no adoption or real-school impact is claimed.

## Open the experience

Node 22 and npm, then:

```sh
npm ci
npm run showcase
```

Open **http://localhost:3100**. The command initializes a separate local PGlite preview, uses a private build directory and disables providers in that process; stored credentials and the shared ledger are untouched. The public homepage, `/how-it-works`, `/demo` and `/technology` need no login, database or provider credentials. The six-chapter tour runs in browser memory. It never creates orders, captures, refunds, messages, invitations or database records. Recorded provider evidence and illustrative AI responses are clearly distinguished.

The existing functional application is linked through `/login`. Its persisted workflows require a privately configured SESSION_SECRET and database/seed; sandbox operator access also requires ADMIN_PASSWORD. Existing credentials remain in ignored `.env`; never paste or commit them. Public exploration does not require changing them.

## Explore

| Route                                  | Experience                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/`                                    | Illustrated product story, real pricing control, four pillars and three AI workflow explanations  |
| `/how-it-works`                        | Deterministic pricing calculator, assistance/funding simulator and payment-state explorer         |
| `/demo`                                | Six interactive chapters: plan, quote review, families, private support, payments, real AG Studio |
| `/technology`                          | Integration roles, architecture and honest evidence/release boundaries                            |
| `/login`                               | Separate role-based fictional workspace / protected sandbox entry                                 |
| `/dashboard`, `/trips`, `/trips/[id]`  | Planning, quotations, consented pricing and financial readiness                                   |
| `/registrations`, `/sponsorship`       | Safe registration/aggregate contribution views                                                    |
| `/finance`                             | Restricted allocations, reconciliation, authorized treasury records and refunds                   |
| `/parent`                              | Own registration, consent, support, checkout, receipts and assistant                              |
| `/messages`, `/analytics`, `/settings` | Communication, actual Studio and integration/workspace configuration                              |

The product’s authoritative financial definitions remain unchanged. At 30 seats, $23 each costs $690; the configured $32 baseline is $270 higher. The initial synthetic cohort has $553 gross, $20.70 fees and $532.30 net, with a $157.70 gap. A pledge is not cash, approved assistance is not free vendor cost, unknown fees block readiness, and refunds can leave retained costs.

## Actual evidence

PayPal sandbox OAuth, the authorized $1 capture/duplicate/full-refund lifecycle, Gemini generation/extraction/report-agent use and actual AG Studio rendering have evidence in `docs/`. The $1 payment was already captured when lifecycle verification began; a repeated request retained one capture, then one full refund completed. PayPal retained $0.54, leaving −$0.54 net. This is a recorded sandbox verification, not a real school contribution. No provider transaction occurs in the public tour or in this visual-polish phase.

The sandbox application is hosted at **[classequity.onrender.com](https://classequity.onrender.com)** on a free, manually deployed Render service with the existing PostgreSQL database. Hosting and webhook registration are separate from genuine signature/delivery proof: see [hosted verification](docs/HOSTED_WEBHOOK_VERIFICATION.md) for the exact status and deployed commit. Twilio WhatsApp delivery remains unverified and its credentials are not provisioned on this host. Shared-password operator access and broader production/audit/treasury controls still need hardening.

Public `/demo` uses local synthetic state and never calls application/provider APIs. Open demo workspace roles use simulated payments/messages and grounded local parent answers; hosted cloud Gemini tools require restricted sandbox access. No production payment mode is available.

## Verify without touching shared data

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run secrets:check
```

See [the local demo guide](docs/DEMO_GUIDE.md) for isolated PGlite setup on **http://localhost:3100**. Use its DATABASE_URL='', LOCAL_DATABASE_DIR and E2E_BASE_URL settings when running `npm run test:e2e`. All browser mutations then stay in local synthetic QA records. Do not point presentation regression tests at the shared Render database. No integration smoke command, provider mutation or shared migration is needed for this phase.

Tests retain the original financial/domain/service/Twilio and presentation cases and add hosted configuration, migration repeatability and webhook boundaries. Browser tests exercise real pages, local tour controls, native AG chart/grid, role authorization, consent flows, mobile/reduced-motion behavior and native dialog/drawer focus. Captures live in ignored `output/playwright/showcase/`; the test JSON report is `output/playwright/results.json`. The separate production smoke suite uses `E2E_HOSTED_URL=https://classequity.onrender.com E2E_BASE_URL=https://classequity.onrender.com npx playwright test -c playwright.hosted.config.ts`; it never invokes payment mutations. Its restricted Studio check requires private local administrator configuration and disables traces/video.

## Documentation and review drafts

[Product story](docs/PRODUCT_STORY.md) · [Website content / claim audit](docs/WEBSITE_CONTENT.md) · [Design system](docs/VISUAL_DESIGN_SYSTEM.md) · [Interactive demo guide](docs/DEMO_GUIDE.md) · [Acceptance](docs/DEMO_ACCEPTANCE.md) · [Hackathon readiness](docs/HACKATHON_READINESS.md) · [Submission draft](docs/SUBMISSION_DRAFT.md) · [Architecture](docs/ARCHITECTURE.md) · [Financial closure](docs/FINANCIAL_WORKFLOW_CLOSURE.md) · [PayPal](docs/PAYPAL_INTEGRATION.md) · [APIMatic](docs/APIMATIC_INTEGRATION.md) · [AG Studio](docs/AG_STUDIO_INTEGRATION.md) · [Security](docs/SECURITY.md).

No video preparation or storyboard is included, following the explicit instruction that the user will prepare their own demo. The hosted follow-up authorizes the free sandbox deployment and webhook configuration; it does not authorize PR merges, repository publication, hackathon submission or any new capture/refund without separate exact-amount approval.

Application source is MIT. Original illustrations/social assets are authored for ClassEquity; installed commercial AG dependencies retain their vendor terms. Public presentation uses real AG components with a vendor trial watermark when no license is applied; it does not grant production licensing rights.

Hosted financial closure is now verified: one separately authorized USD 1 sandbox capture/full refund, genuine signed approval/capture/refund events, independent readback and real duplicate delivery. The prior transaction is unchanged. See [hosted verification](docs/HOSTED_WEBHOOK_VERIFICATION.md). No further financial mutation is authorized.

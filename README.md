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

Twilio account authentication is verified; actual WhatsApp delivery is not. Existing Render PostgreSQL is hosted; the web application is **not deployed**. Genuine public signed webhook delivery remains blocked on canonical HTTPS and registration. Shared-password operator access and broader production/audit/treasury controls still need hardening.

## Verify without touching shared data

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run secrets:check
```

See [the local demo guide](docs/DEMO_GUIDE.md) for isolated PGlite setup on **http://localhost:3100**. Use its DATABASE_URL='', LOCAL_DATABASE_DIR and E2E_BASE_URL settings when running `npm run test:e2e`. All browser mutations then stay in local synthetic QA records. Do not point presentation regression tests at the shared Render database. No integration smoke command, provider mutation or shared migration is needed for this phase.

Tests include the retained 39 financial/domain/service/Twilio cases plus six presentation cases. Browser tests exercise real pages, local tour controls, native AG chart/grid, role authorization, consent flows, mobile/reduced-motion behavior and native dialog/drawer focus. Captures live in ignored `output/playwright/showcase/`; the test JSON report is `output/playwright/results.json`.

## Documentation and review drafts

[Product story](docs/PRODUCT_STORY.md) · [Website content / claim audit](docs/WEBSITE_CONTENT.md) · [Design system](docs/VISUAL_DESIGN_SYSTEM.md) · [Interactive demo guide](docs/DEMO_GUIDE.md) · [Acceptance](docs/DEMO_ACCEPTANCE.md) · [Hackathon readiness](docs/HACKATHON_READINESS.md) · [Submission draft](docs/SUBMISSION_DRAFT.md) · [Architecture](docs/ARCHITECTURE.md) · [Financial closure](docs/FINANCIAL_WORKFLOW_CLOSURE.md) · [PayPal](docs/PAYPAL_INTEGRATION.md) · [APIMatic](docs/APIMATIC_INTEGRATION.md) · [AG Studio](docs/AG_STUDIO_INTEGRATION.md) · [Security](docs/SECURITY.md).

No video preparation or storyboard is included, following the explicit instruction that the user will prepare their own demo. No submission, deployment, merge or repository-visibility change is authorized in this phase.

Application source is MIT. Original illustrations/social assets are authored for ClassEquity; installed commercial AG dependencies retain their vendor terms. Public presentation uses real AG components with a vendor trial watermark when no license is applied; it does not grant production licensing rights.

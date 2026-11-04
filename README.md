# ClassEquity

**Every child belongs on the trip. Every payment is accounted for.**

An implemented school-activity coordination MVP for the PayPal AI Hackathon 2026: group pricing, parent consent, confidential support, voluntary sponsorship, PayPal sandbox checkout, WhatsApp communication, Gemini document intelligence, and genuine editable AG Studio analytics.

## Run

Node **22.23.1**, npm. Existing local credentials are in ignored `.env` (do not paste or commit it). For a fresh checkout:

```sh
npm ci
cp .env.example .env
# Configure SESSION_SECRET, ADMIN_PASSWORD and optional provider credentials privately.
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:3000**. Interactive demo → School admin, Finance admin, Teacher, or Parent. All demo money and identities are synthetic. Sandbox workspace uses the private `ADMIN_PASSWORD`; parents use short-lived single-use invitations. Use the exact APP_URL origin: localhost and 127.0.0.1 are different for CSRF.

Empty DATABASE_URL locally uses durable PostgreSQL-compatible PGlite under `.data/postgres`. Production requires PostgreSQL. This workspace is connected to the already-existing free Render `classequity-db`; its initially empty schema was inspected before the non-destructive migration and seed. No duplicate database or paid upgrade was created.

## Product paths

| Route                   | Experience                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `/`                     | Public product introduction and interactive demo                                               |
| `/login`                | Synthetic role demo / protected sandbox operator entry                                         |
| `/dashboard`            | School overview and net funding readiness                                                      |
| `/trips`, `/trips/[id]` | Create/edit trip, pricing tiers, invitations, price freeze, quote upload/review                |
| `/registrations`        | Searchable synthetic registration list, no aid mapping                                         |
| `/sponsorship`          | Permitted aggregate community-funding information                                              |
| `/parent`               | Registration, consent, private support requests, sponsorship, checkout, receipts and assistant |
| `/invite/[token]`       | Expiring one-use family session invitation                                                     |
| `/finance`              | Restricted assistance decisions, payment reconciliation, refunds, audit export, funded demo    |
| `/analytics`            | Actual AG Studio 3.1 report and Gemini Agent Framework                                         |
| `/messages`             | Clearly labeled WhatsApp simulator and permitted reminders                                     |
| `/settings`             | School identity and truthful integration readiness                                             |

`/api/[...path]` provides authenticated, scoped application services; `/api/webhooks/paypal`, `/api/webhooks/twilio`, `/api/webhooks/twilio/status` authenticate provider callbacks. `/api/export` exports aggregate reconciliation CSV.

## Financial outcome

30 × $23 = **$690** required. 25 ordinary family obligations = **$575**, five approved fully supported seats = **$115**, and sponsorship commitments = **$115**. Initial synthetic captured gross is **$553**, fees **$20.70**, net available **$532.30**, remaining gap **$157.70**. Commitments, registrations and PayPal approvals are not completed money. The separate fully-funded simulation explicitly completes synthetic captures and adds a synthetic school fee reserve. Integer cents are authoritative; no cross-family payment atomicity is claimed.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run integrations:check
render blueprints validate render.yaml --output json
```

Unit/service tests use isolated in-memory PGlite, not the shared Render database. Browser tests use whichever database the local running app is configured to use and avoid real charges. `scripts/verify-ai.ts` performs bounded real Gemini checks using a fictional vendor quote. Never automate sandbox buyer credentials or approval.

## Provider status and deployment

PayPal sandbox OAuth, Twilio account authentication, and Gemini Flash Lite generation have actual provider evidence. One genuine PayPal sandbox order was created with explicit approval; it awaits human buyer approval. No capture/refund or real WhatsApp delivery is claimed. Public HTTPS webhook registration remains required. See evidence JSON and the implementation report for the precise verified scope.

`render.yaml` is validated and creates a **free web service only**, reusing the existing database via a privately configured connection URL. Do not create another database or upgrade a plan. GitHub source must stay private. Hosting/source push depend on GitHub authentication; see `docs/IMPLEMENTATION_REPORT.md` for current completion status.

## Documentation

[Architecture](docs/ARCHITECTURE.md) · [Environment](docs/ENVIRONMENT.md) · [PayPal](docs/PAYPAL_INTEGRATION.md) · [Twilio](docs/TWILIO_INTEGRATION.md) · [APIMatic evidence](docs/APIMATIC_INTEGRATION.md) · [AG Studio](docs/AG_STUDIO_INTEGRATION.md) · [Security](docs/SECURITY.md) · [3-minute demo](docs/DEMO_GUIDE.md) · [Submission draft](docs/SUBMISSION_DRAFT.md) · [Implementation report](docs/IMPLEMENTATION_REPORT.md).

Application source is MIT; commercial AG Studio/Grid/Charts dependencies retain their vendor licence terms. The supplied Studio trial is used only as its licence permits. This is a synthetic-data hackathon demo, not escrow or a regulated/nonprofit payment service.

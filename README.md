# ClassEquity

**Every child belongs on the trip. Every payment is accounted for.**

ClassEquity is an AI-assisted school-trip coordination and financial accountability platform built with Next.js, PostgreSQL, PayPal Sandbox, Google Gemini, Twilio WhatsApp, APIMatic SDK tooling, and native AG Studio / AG Grid analytics.

**Real application. Working integrations. Sample school data. Verified PayPal Sandbox transactions.**

**A full refund does not necessarily restore the original financial position.** In ClassEquity's observed PayPal Sandbox exercise, a completed $1.00 full refund retained **$0.54** in processing fees, producing a **−$0.54 net** balance for that transaction. Not all providers or merchant accounts use this fee structure, which is exactly why schools must track verified **net** available funds rather than treating payment receipts or refund completions as full balance restoration.

_Canonical Oakwood Academy demonstration example (independent of the Sandbox $0.54 refund exercise):_

| Metric                   |  Amount |
| ------------------------ | ------: |
| Registrations            |      30 |
| Seat price               |  $23.00 |
| Required funding         | $690.00 |
| Simulated gross captures | $553.00 |
| Simulated fees           |  $20.70 |
| Simulated net funding    | $532.30 |
| Funding gap              | $157.70 |

The $157.70 demonstration gap is not caused by the historical Sandbox $0.54 refund fee. These are independent examples.

**Why it differs:** Participation-based group pricing helps families afford the trip while parental consent ceilings, private assistance separation, idempotent financial claims, and net-funding accounting keep every seat inspectable.

## Try the working application

- **Live application:** https://classequity.onrender.com
- **Interactive 6-chapter tour:** https://classequity.onrender.com/demo
- **Explore demo roles (no login required):** https://classequity.onrender.com/login
- **Technology & verified evidence:** https://classequity.onrender.com/technology
- **Public repository:** https://github.com/subodhkant7/classequity

### 90-second judge evaluation

The interactive demo uses sample school and family data. Previews stay in your browser tab (`sessionStorage`), protecting the canonical server dataset from cross-visitor contamination. The deployed Render web service may take time to wake after inactivity; if hosted access is impaired, the credential-free local showcase below reproduces the demo locally.

1. **30 seconds — Interactive Tour** ([classequity.onrender.com/demo](https://classequity.onrender.com/demo))
   Step through the six-chapter product demonstration covering sample quotation review, participation-based pricing, private assistance, payment reconciliation, and interactive analytics. Deterministic sample price tiers drop as participation grows:
   - **1–19 registrations:** $32
   - **20–29 registrations:** $27
   - **30+ registrations:** $23
2. **45 seconds — Interactive Role-Based Workspace** ([classequity.onrender.com/login](https://classequity.onrender.com/login))
   Select **Interactive demo** (no credentials required for public demo roles; School admin, Finance admin, Teacher, and Parent are offered):
   - **Finance admin:** inspect the **$157.70** funding gap, payment operations, simulated contribution/refund previews, and native AG Studio reconciliation analytics.
   - **Parent:** review registration, price-ceiling consent, private assistance status, and simulated family contributions.
   - **Teacher:** view role-restricted aggregate trip information without accessing individual assistance records.
     All demo edits are browser-local simulations (`sessionStorage`); direct server mutations fail closed with `403 DEMO_READ_ONLY`, preserving canonical Oakwood Academy records for every judge.
3. **15 seconds — Verified Technology & Payment Evidence** ([classequity.onrender.com/technology](https://classequity.onrender.com/technology))
   Inspect the integration boundaries and recorded PayPal Sandbox verification—signed webhook handling, independent provider readbacks, duplicate-event protection, and retained refund fee accounting. These records reflect **previously verified Sandbox evidence, not transactions triggered by visiting the public tour**.

## Capabilities across the lifecycle

1. **Review quotations.** Gemini extracts a sample vendor quotation into structured pricing tiers and terms; an authorized human reviews and activates pricing.
2. **Unlock group prices with consent.** Families approve an explicit price ceiling; obligations freeze only within recorded consent and never increase after another family withdraws.
3. **Keep assistance private.** Finance reviews individual assistance requests privately; teachers and external summaries receive aggregate numbers rather than recipient mappings.
4. **Reconcile net funding.** PayPal Sandbox payment and refund operations use durable claim rows, signed webhook handling, independent provider readbacks, explicit fee/refund accounting, and no blind retries after unknown outcomes.
5. **Explain the numbers safely.** Native AG Studio / AG Grid components present editable financial reports and reconciliation tables; Gemini assistant prompts operate on permitted non-recipient aggregates and have **no payment, pricing, consent, or assistance mutation authority**.

## Verified integrations and evidence

### What was actually verified?

| Integration                      | Observed verification                                                                                                                                                                                  | Scope & boundary                                                                                                                                                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PayPal Sandbox**               | Two separately authorized $1 capture and full refund exercises completed with signed callbacks, independent provider readback, and duplicate/redelivery handling                                       | **Sandbox only**, not live-money processing; separate from public tour simulations                                                                                                                                                                                                    |
| **Net Financial Reconciliation** | Observed $1 completed full refund retained **$0.54** in fees and produced a **−$0.54 net** transaction balance                                                                                         | Do not generalize this fee to all merchants or payment providers                                                                                                                                                                                                                      |
| **Google Gemini**                | Hosted English and Hindi trip assistance verified using **`gemini-2.5-flash-lite`** in restricted sandbox; local PDF quotation extraction and editable AG Studio report generation verified separately | Hosted PDF extraction previously returned HTTP 502, and hosted Studio agent generation remains unverified (available logs did not establish a root cause). PNG issuer extraction may require manual correction. See [Hosted Gemini verification](docs/HOSTED_GEMINI_VERIFICATION.md). |
| **AG Grid / AG Studio**          | Native interactive financial analytics, editable reports, reconciliation tables, and custom widgets rendered and exercised                                                                             | Commercial/evaluation vendor licensing terms apply beyond judging evaluation ([Third-party notices](THIRD_PARTY_NOTICES.md))                                                                                                                                                          |
| **APIMatic**                     | Official APIMatic-generated `@paypal/paypal-server-sdk` and APIMatic Context Plugins used for PayPal and Twilio integration contracts                                                                  | Integration/SDK tooling only; **not** a runtime payment processor                                                                                                                                                                                                                     |
| **Twilio WhatsApp**              | One authorized outbound Sandbox message reached provider-confirmed **delivered** status                                                                                                                | Genuine hosted inbound and delivery-status callbacks remain unverified; public demo messaging is simulated                                                                                                                                                                            |
| **Render**                       | Live HTTPS Node application and paid PostgreSQL 17 deployment (`classequity` + `classequity-db`) with separately identified source and runtime commits                                                 | Web service deploys manually and may cold-start; verify `/api/health` for the active commit                                                                                                                                                                                           |

Detailed verification records: [PayPal hosted verification](docs/HOSTED_WEBHOOK_VERIFICATION.md) · [Hosted Gemini verification](docs/HOSTED_GEMINI_VERIFICATION.md) · [Local Gemini & Twilio verification](docs/PROVIDER_LIVE_VERIFICATION.md) · [APIMatic integration](docs/APIMATIC_INTEGRATION.md) · [Historical PR #4 manifest](docs/RELEASE_MANIFEST.json).

## Architecture and security boundaries

- **Stack:** Next.js App Router, React, strict TypeScript, Zod validation, Drizzle ORM.
- **Databases:** PostgreSQL 17 in hosted deployment; isolated local PGlite for credential-free showcase and unit tests.
- **Deterministic financial core:** Integer-cent domain arithmetic, immutable price snapshots, transactional capture/refund claim locking, and provider readback before completion.
- **Tenant & boundary enforcement:** Public interactive demo accounts read canonical Oakwood Academy data without mutating server records (`403 DEMO_READ_ONLY`, browser-local `sessionStorage`, per-session quotas, `405` on unsupported methods). `HOSTED_RESTRICT_PUBLIC_AI=true` blocks cloud Gemini calls from unprivileged public sessions. Restricted Sandbox operator login uses a shared hackathon `ADMIN_PASSWORD` and is **not production-grade identity**.
- **Further reading:** [Architecture](docs/ARCHITECTURE.md) · [Security and limitations](docs/SECURITY.md)

## Credential-free local showcase

Run the entire public tour, role-based workspace, and native AG Studio interface locally with no external accounts or API keys:

- **Requirements:** Node.js **22.23.1** (supported `>=22.22.0 <23`), npm, local port **3100**.

```bash
git clone https://github.com/subodhkant7/classequity.git
cd classequity
npm ci
npm run showcase
```

Open **http://localhost:3100**. The launcher initializes an isolated local PGlite sample database (`.data/experience-preview`), generates local-only session secrets, and clears provider credentials from its child process so it never touches hosted PostgreSQL, PayPal, Twilio, or Gemini. Stop with Ctrl+C.

## Development and deployment instructions

### Environment variables (`.env.example`)

For custom local development or your own hosted deployment, copy [`.env.example`](.env.example):

```bash
cp .env.example .env
openssl rand -hex 32  # SESSION_SECRET
openssl rand -hex 32  # ADMIN_PASSWORD
```

**Do not copy credentials from another deployment. Never commit `.env`, approval URLs, buyer records, webhook payloads, or private backups.**

```dotenv
# Canonical browser origin; use https://your-domain in production
APP_URL=http://localhost:3000
# Empty = local PGlite; hosted deployment requires private PostgreSQL 17
DATABASE_URL=
# Two distinct strong secrets
SESSION_SECRET=
ADMIN_PASSWORD=
DEMO_MODE=true
# MUST be true on hosted public deployments
HOSTED_RESTRICT_PUBLIC_AI=false
# Sandbox only; live-money PayPal mode is not implemented
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
# Optional WhatsApp sandbox
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
# Optional locally; required by hosted release:check
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_FAST_MODEL=gemini-2.5-flash-lite
# Optional vendor licence key within granted terms
AG_STUDIO_LICENSE_KEY=
```

`APP_URL` must match the exact HTTPS browser origin with no subpath. The hosted preflight (`npm run release:check`) requires database name `classequity`, `SESSION_SECRET` (>=32 chars), `ADMIN_PASSWORD` (>=16 chars), `DEMO_MODE=true`, `HOSTED_RESTRICT_PUBLIC_AI=true`, `PAYPAL_ENV=sandbox`, PayPal Sandbox credentials, and `GEMINI_API_KEY`. The default `TWILIO_WHATSAPP_FROM` number is Twilio's public shared Sandbox example number.

### Custom local workspace

Do not run migrations, seeding, or test harnesses against the published ClassEquity PostgreSQL database.

```bash
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:3000**.

### Deploying your own Render + PostgreSQL instance

1. **Provision PostgreSQL 17:** Create a dedicated empty database named `classequity`. Keep credentials private, use Render's internal connection URL for the web service, and restrict external IP access.
2. **Initialize once from a trusted environment:** Run `npm run db:migrate` and `npm run db:seed` against your own database after reviewing SQL migrations. Never migrate or seed during web startup.
3. **Configure Render Node web service:**

   | Setting           | Value                                                            |
   | ----------------- | ---------------------------------------------------------------- |
   | Runtime / Node    | Node `22.23.1`                                                   |
   | Build command     | `npm ci --include=dev && npm run release:check && npm run build` |
   | Start command     | `npm start`                                                      |
   | Health-check path | `/api/health`                                                    |
   | Auto-deploy       | Off (recommended for release-gated deploys)                      |

4. **Set private environment variables:** Provide `APP_URL`, private `DATABASE_URL`, distinct `SESSION_SECRET`/`ADMIN_PASSWORD`, `DEMO_MODE=true`, `HOSTED_RESTRICT_PUBLIC_AI=true`, `PAYPAL_ENV=sandbox`, PayPal Sandbox credentials, and `GEMINI_API_KEY`.
5. **Verify deployment:** Confirm `/api/health`, `/demo`, `/login`, role/demo isolation, and runtime logs without printing secrets.
6. **Optional webhooks:** Configure PayPal Sandbox webhook `https://your-host/api/webhooks/paypal` (`PAYPAL_WEBHOOK_ID`), and optionally Twilio WhatsApp `POST /api/webhooks/twilio` / `POST /api/webhooks/twilio/status`.

[`render.yaml`](render.yaml) is preserved only as a historical provisioning reference, not an active Blueprint sync. See [Environment and operations](docs/ENVIRONMENT.md) and [Judge readiness](docs/HACKATHON_READINESS.md).

## Tests and reproducibility

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run secrets:check
```

- **Financial concurrency (`npm run test:financial:concurrency`)**: Requires a disposable local or CI PostgreSQL database (`DATABASE_URL`); never target production.
- **Browser E2E (`npm run test:e2e`)**: Requires a disposable database/app and Playwright Chromium (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml) and [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md)).

Verified CI baseline ([GitHub Actions run 43107386611](https://github.com/subodhkant7/classequity/actions/runs/43107386611) on PR #8 fix commit `565af06`; ongoing workflow history in [CI runs](https://github.com/subodhkant7/classequity/actions/workflows/ci.yml)):

- **78 unit and service tests** (`npm test`)
- **6 multi-process financial concurrency scenarios** (`npm run test:financial:concurrency`)
- **25 Playwright browser tests** (`npm run test:e2e` against production build)

Local unit/E2E runs, remote GitHub Actions CI, and live hosted verification are distinct checks recorded separately; deployment SHAs are confirmed at `/api/health`.

## Known limitations and vendor licensing

- Sample Oakwood Academy data and **PayPal Sandbox** only; not a certified payment processor, escrow account, or production school platform. **Do not enter real student, hardship, or payment data.**
- Hosted Gemini verification established English/Hindi assistance (`gemini-2.5-flash-lite`); hosted PDF quotation extraction previously returned HTTP 502, hosted Studio agent generation remains untested, PNG quotation issuers may require manual correction, and genuine hosted Twilio callbacks remain unverified.
- Restricted Sandbox operator login uses a shared password (`ADMIN_PASSWORD`) rather than individual IdP/MFA credentials.
- External PostgreSQL IP allowlists, web service cold starts, and production compliance require hardening before real school use.
- **Licensing:** ClassEquity source and original artwork are under the [MIT License](LICENSE). **AG Studio, AG Grid Enterprise, and AG Charts Enterprise remain subject to AG Grid vendor evaluation/commercial terms** and are not sublicensed under MIT. See [Third-party notices](THIRD_PARTY_NOTICES.md).

Built for the [PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/).

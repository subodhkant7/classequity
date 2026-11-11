# ClassEquity

**Every child belongs on the trip. Every payment is accounted for.**

ClassEquity is an MIT-licensed, hackathon-stage school-trip coordination and financial-accountability application. It brings **group pricing, parent consent, confidential assistance, PayPal Sandbox reconciliation, and AI-supported administration** into one experience.

**Live demo:** https://classequity.onrender.com · **Interactive tour:** https://classequity.onrender.com/demo · **Try functional fictional roles:** https://classequity.onrender.com/login

> **Scope:** This project is a working prototype using fictional school/family data and PayPal **Sandbox**, not a real-money payment platform or a production school information system. Public demonstrations and recorded provider verification are intentionally distinguished throughout.

## The problem

A school trip is more affordable when more families participate—but participation changes the quoted price, parents need certainty about what they have approved, and some families may need help without disclosing their circumstances. Spreadsheets, messages, promises to sponsor, and payment screenshots make it hard to answer one operational question: **Is every seat actually funded?**

A successful payment request is not proof of settlement. A refund can leave processing fees behind. A pledged contribution is not captured money. An unknown or delayed provider outcome must not be counted as paid.

## The solution

ClassEquity links **affordability** with **financial truth**:

1. **Review quotations.** Gemini extracts a fictional vendor quote into structured tiers and terms; an authorized human must review the result before activating pricing.
2. **Unlock group prices.** The example trip falls from **$32** per seat (1–19 registrations) to **$27** (20–29) and **$23** (30+). Families approve price ceilings; an obligation is frozen only within the applicable consent.
3. **Keep assistance private.** Finance manages individual assistance; teacher and sponsor views receive authorized aggregate information rather than recipient identities.
4. **Verify funding.** PayPal Sandbox operations use durable request identities, authenticated webhooks, independent provider readback, explicit fee/refund accounting, and no blind retries after ambiguous outcomes. Synthetic contributions and promises do not masquerade as provider-confirmed cash.
5. **Explain the result.** Native AG Studio/AG Grid views display reconciliation, funding gaps and editable reports. Gemini can assist with permitted aggregates but has **no payment, pricing, consent or assistance mutation authority**.

**Why it differs:** Lowering the quoted seat price is only one part of making a trip accessible. ClassEquity also makes the consent, privacy and verified **net** funding behind each seat inspectable.

## Try the working application

| Experience | What to try | Evidence boundary |
| --- | --- | --- |
| [Interactive tour](https://classequity.onrender.com/demo) | Six chapters: pricing, quote review, families, assistance, payments and financial intelligence | Client-side fictional interactions; no provider calls or saved changes |
| [How it works](https://classequity.onrender.com/how-it-works) | Pricing and funding calculators | Fictional scenario |
| [Functional workspace](https://classequity.onrender.com/login) | Choose **Interactive demo**, then School admin, Parent, Teacher or Finance admin | Persisted **synthetic** data, simulated payments/messages; no credentials required |
| [Technology and evidence](https://classequity.onrender.com/technology) | Integration boundaries and recorded results | Earlier sandbox/local verification; not a fresh provider operation |

The deployed Render web service may need time to wake after inactivity. If hosted access is impaired, the credential-free local showcase below reproduces the functional fictional workflow without provider credentials.

### What was actually verified?

| Integration | Observed result | Limit |
| --- | --- | --- |
| **PayPal** | Two separately authorized $1 Sandbox capture/refund exercises; the hosted exercise received genuine signed approval, capture and refund callbacks, with independent readback and safe redelivery | **Sandbox only**, not live money; recorded events are separate from the fictional school demonstration |
| **Fee reconciliation** | Each completed $1 full refund retained a reported **$0.54** fee, producing **−$0.54** net for that transaction | Do not generalize this fee to other merchants or transactions |
| **Gemini** | Actual local Flash-Lite generation, PDF quote extraction, English/Hindi trip answers and editable AG Studio report creation | Hosted cloud generation **not independently verified**; the public tour uses labeled recorded/illustrative examples; a PNG issuer may require manual entry |
| **Twilio WhatsApp** | One authorized outbound Sandbox message reached provider-reported **delivered** | Genuine hosted inbound/status callbacks remain unverified; public message demo is simulated |
| **AG Studio / AG Grid** | Genuine native interactive reports and widgets rendered and exercised | Commercial vendor terms apply to AG Studio/Enterprise dependencies |
| **APIMatic** | PayPal/Twilio Context Plugins informed implementation contracts; the installed official **@paypal/paypal-server-sdk** is APIMatic-generated | APIMatic is a development/SDK contributor, **not** a payment processor or runtime backend |

Detailed evidence: [PayPal hosted verification](docs/HOSTED_WEBHOOK_VERIFICATION.md) · [Gemini and Twilio provider verification](docs/PROVIDER_LIVE_VERIFICATION.md) · [APIMatic integration](docs/APIMATIC_INTEGRATION.md) · [Release manifest](docs/RELEASE_MANIFEST.json).

## Architecture and safety boundaries

- **Application:** Next.js App Router, React, strict TypeScript, Zod validation.
- **Data:** Drizzle ORM with PostgreSQL 17 for hosting; isolated PGlite for local demo.
- **Financial core:** deterministic integer-cent calculations; versioned/frozen pricing; durable payment/refund claims, independent readbacks and reconciliation.
- **External tools:** PayPal Sandbox through the official APIMatic-generated Server SDK; Gemini via Google Gen AI SDK; Twilio via its official SDK; native AG Studio/AG Grid.
- **Hosting:** Render HTTPS Node service and a paid PostgreSQL instance; current deployment and repository revisions are documented separately.

**Security model:** Separate fictional demo and restricted sandbox tenants; finance-only assistance mappings; server-side role/ownership checks; scoped single-use links; PayPal and Twilio signature validation; bounded AI inputs; and no direct AI authority over financial operations. The restricted sandbox uses a shared operator password and is **not production-grade identity**. See [Architecture](docs/ARCHITECTURE.md) and [Security and limitations](docs/SECURITY.md).

## Requirements and quick start (no credentials needed)

- Node.js **22.23.1** (supported range `>=22.22.0 <23`), npm, and an available local port **3100**.
- macOS, Linux or Windows environment able to run Node and a modern browser.

~~~bash
git clone https://github.com/subodhkant7/classequity.git
cd classequity
npm ci
npm run showcase
~~~

Open **http://localhost:3100**. The showcase launches an isolated fictional PGlite database, creates temporary local-only session secrets and **disables provider credentials in its child process**. Select any fictional role at **/login** to explore the application and native analytics. It does not use the hosted PostgreSQL database or PayPal/Twilio/Gemini services. Stop with Ctrl+C.

The project is presently kept private pending the final publication approval; cloning from GitHub requires access until it becomes public.

## Environment variables (.env.example)

For custom local development or your own hosted installation, copy the checked-in [`.env.example`](.env.example):

~~~bash
cp .env.example .env
openssl rand -hex 32  # generate SESSION_SECRET; store in .env
openssl rand -hex 32  # generate ADMIN_PASSWORD; store in .env
~~~

**Do not copy credentials from another user's deployment. Never commit `.env`, approval URLs, buyer data, real webhook payloads or private backups.** This is the complete public configuration template (empty values require your own credentials when using those integrations):

~~~dotenv
# Canonical browser origin; change to https://your-domain for hosting
APP_URL=http://localhost:3000
# Empty = local PGlite; hosting requires a private PostgreSQL 17 connection
DATABASE_URL=
# Generate two distinct strong secrets; do not reuse them
SESSION_SECRET=
ADMIN_PASSWORD=
# The public fictional demo is intentionally enabled for this hackathon
DEMO_MODE=true
# MUST be true on hosted public deployments; local dev can set false if authorized
HOSTED_RESTRICT_PUBLIC_AI=false
# Sandbox only; real-money PayPal mode is not implemented
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
# Optional: real WhatsApp requires separate account, opt-in and verified callbacks
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
# Gemini provider use is optional for the credential-free showcase
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_FAST_MODEL=gemini-2.5-flash-lite
# Vendor licence only when you have the rights to use it
AG_STUDIO_LICENSE_KEY=
~~~

**Configuration rules:** `APP_URL` must match the browser origin exactly (including HTTPS in production; no subpath). The hosted release preflight requires a database whose name is **classequity**, `SESSION_SECRET` of at least 32 characters, `ADMIN_PASSWORD` of at least 16 characters, **`DEMO_MODE=true`**, **`HOSTED_RESTRICT_PUBLIC_AI=true`**, `PAYPAL_ENV=sandbox`, the PayPal Sandbox credentials and `GEMINI_API_KEY`. These are configuration requirements, **not** proof of successful Gemini generation. `PAYPAL_WEBHOOK_ID` is set after configuring the provider webhook. Twilio variables are optional unless enabling WhatsApp.

The default Twilio Sandbox sender above is a **public Twilio example**, not a ClassEquity private credential. Use your own approved sender when appropriate. Keep any AG Studio licence within the vendor's granted scope.

## Custom local development

For a separate development workspace (not the credential-free showcase):

1. Populate `.env` with independent, non-production secrets and `APP_URL=http://localhost:3000`.
2. Leave `DATABASE_URL` blank to use durable local PGlite, or provide a dedicated disposable PostgreSQL database.
3. Run the reviewed migrations and fictional seed **only on your own dedicated database**:

~~~bash
npm ci
npm run db:migrate
npm run db:seed
npm run dev
~~~

Visit **http://localhost:3000**. A different host such as `127.0.0.1` is a different origin; keep `APP_URL` consistent with the actual URL.

Do not point migrations, seeding or test commands at the published ClassEquity database.

## Deploy your own instance (Render / PostgreSQL)

**This is an operator procedure, not an automatic deployment.** Deploy only to a database and provider accounts you control.

1. **Provision PostgreSQL 17.** Create an empty dedicated database named **classequity**. Keep its credentials private; prefer Render's internal connection URL for a same-region web service. Require TLS where appropriate and narrow the database's external IP allowlist. Do not use a shared database or reuse the existing ClassEquity demo database.
2. **Initialize the new database once.** From a trusted one-off environment with `DATABASE_URL` pointing to your new database, run the reviewed `npm run db:migrate` and then `npm run db:seed` to create the fictional workspaces. Inspect the target database and migration files first. **Do not run migrations or seeding in the web service startup command**; do not seed a database that already contains real records.
3. **Create a Render Node web service** from your fork. Use Node **22.23.1**, a compatible region, and your reviewed deployment branch. Set:

   | Render setting | Value |
   | --- | --- |
   | Build command | `npm ci --include=dev && npm run release:check && npm run build` |
   | Start command | `npm start` |
   | Health-check path | `/api/health` |
   | Runtime | Node |

   The build preflight is **read-only** and requires the initialized migration ledger and fictional workspaces to exist. A failing preflight is a reason to inspect the database, **not** to blindly replay setup.
4. **Configure environment variables** privately in Render using the template above. Set `APP_URL=https://your-actual-host`, `DATABASE_URL` to your dedicated PostgreSQL connection, `HOSTED_RESTRICT_PUBLIC_AI=true`, `DEMO_MODE=true`, and `PAYPAL_ENV=sandbox`. Use distinct `SESSION_SECRET` and `ADMIN_PASSWORD`. The hosted release preflight also requires PayPal Sandbox credentials and a Gemini key; the public demo must not receive AI/provider authority.
5. **Deploy and verify.** Confirm HTTPS health at `/api/health`, then open `/demo` and the fictional roles through `/login` in a clean browser. Test tenant/role restrictions. Check hosting logs **without printing secrets**. For paid database plans, separately verify backups and restore readiness; web-service cold starts may still occur.
6. **Optional provider webhooks.** Register your own PayPal Sandbox webhook destination **`https://your-actual-host/api/webhooks/paypal`**, subscribe to the supported approval/capture/refund events, and store its real `PAYPAL_WEBHOOK_ID` privately. Do not send new captures/refunds without independent authorization. For a separately authorized Twilio WhatsApp sandbox, inbound is **`POST /api/webhooks/twilio`** and status is **`POST /api/webhooks/twilio/status`**; validate exact HTTPS URL/signature, participant opt-in and callback delivery. Hosted Twilio callbacks have **not** been independently verified for this project.

**Important:** [`render.yaml`](render.yaml) was originally a reference for an existing manually provisioned service, not an automatically synchronized infrastructure stack. Review its branch, plan and environment variables before applying it as a Blueprint; it does **not** create PostgreSQL and must not be used to overwrite someone else's deployment. Migrations/seeding are never implicit during build/start.

For additional operations details, see [Environment and operations](docs/ENVIRONMENT.md), [Judge access](docs/HACKATHON_READINESS.md), and [Security](docs/SECURITY.md).

## Tests and reproducibility

~~~bash
npm run typecheck
npm run lint
npm test
npm run build
npm run secrets:check
~~~

**Concurrency tests** (`npm run test:financial:concurrency`) require a separately configured disposable PostgreSQL 17 database; the test harness must not target production. **Browser tests** (`npm run test:e2e`) require a prepared isolated local or CI application and Playwright Chromium, as documented in [Demo guide](docs/DEMO_GUIDE.md) and [.github/workflows/ci.yml](.github/workflows/ci.yml).

The most recent integration merge reported **74 unit/service tests, six financial concurrency scenarios and 12 browser tests** passing. The exact historical checks, CI runs and deployed commit are recorded in the [release manifest](docs/RELEASE_MANIFEST.json); CI and deployment may be at different SHAs.

## Known limits and production boundary

- Fictional school/parent data; PayPal **Sandbox**, not live payments or demonstrated school adoption.
- Hosted Gemini generation and genuine hosted Twilio callback delivery remain unverified; local Gemini workflows and one Twilio outbound Sandbox delivery were verified separately.
- PNG quote issuer extraction may need manual correction; human review is mandatory.
- Sandbox operator access uses a shared password, not independent IdP/MFA.
- Paid PostgreSQL reduces free-tier expiry risk but does not remove cold-start, backup or operational risk. The web service is deployed manually.
- Database network access, commercial AG Studio usage rights, application hardening, data protection and operational procedures require further review before using real family or financial information.

**Do not enter real student, hardship or personal financial data.** This repository is not a certified payment processor, escrow service or production school platform.

## Hackathon submission and acknowledgements

Built for the [PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/). The submission consists of a **functional hosted demonstration**, reproducible source and setup instructions, an openly licensed project, and a **public YouTube video under three minutes**. See the [submission materials](docs/SUBMISSION_DRAFT.md). Publication and submission are separate owner-controlled actions.

**Technologies and contributions:** PayPal Developer Platform and official APIMatic-generated PayPal Server SDK; Google Gemini; APIMatic Context Plugins for PayPal and Twilio API guidance; official Twilio SDK; AG Studio/AG Grid; Next.js; PostgreSQL/PGlite; Render. APIMatic itself does not execute payments. AG Studio and Enterprise components are separately licensed—see [Third-party notices](THIRD_PARTY_NOTICES.md).

## Licence

ClassEquity's own source and original project artwork are distributed under the [MIT License](LICENSE). Dependencies and commercial components retain **their own** licences and terms; the project MIT licence does **not** sublicense AG Studio/Enterprise. See [Third-party notices](THIRD_PARTY_NOTICES.md).

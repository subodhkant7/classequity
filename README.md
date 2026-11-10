# ClassEquity

ClassEquity helps schools plan trips, unlock group pricing, keep family assistance private and reconcile funding. Families consent to a price ceiling before a school freezes what they owe. Finance teams can see which seats are funded after processing fees and refunds. Gemini helps with quote review, parent questions and reports.

## Try ClassEquity

The hosted site offers a six-chapter interactive tour and a working fictional workspace. Open `/login`, choose **Interactive demo**, select a role and enter. School admin shows planning and the dashboard. Parent shows registration, consent and receipts. Finance admin shows restricted allocations for fictional families. Analytics opens editable AG Studio reports. [Hosted application](https://classequity.onrender.com) · [Interactive tour](https://classequity.onrender.com/demo) · [Workspace sign-in](https://classequity.onrender.com/login)

The tour computes pricing and funding in the browser. Its AI examples identify recorded or illustrative output, and the PayPal timeline identifies recorded sandbox evidence. The fictional workspace persists demo activity and simulates payments. The restricted sandbox workspace supports actual sandbox payment operations and configured Gemini access. Judges can use every demo role without credentials.

Render may show a wake-up screen on the first visit. The free database expires December 5, 2026 at 02:18 IST, during judging. The independently reproducible local showcase below is the continuity path. [Judge access and recovery plan](docs/HACKATHON_READINESS.md)

## Run locally from a clean checkout

Use Node.js 22.23.1 (`.nvmrc`, supported range `>=22.22.0 <23`) and npm. From the repository root run:

```sh
npm ci
npm run showcase
```

Open [localhost:3100](http://localhost:3100). The command initializes an isolated PGlite database from the checked-in migrations and fictional seed and starts Next.js on loopback. It uses local session credentials and disables provider calls. Use the demo roles on `/login` to try functional workflows, including native analytics. Each developer can reproduce this without a Render database or provider credentials. AG Studio's vendor evaluation terms apply to its components. [Third-party notices](THIRD_PARTY_NOTICES.md)

For an independently configured workspace, copy `.env.example` to `.env`, set the exact `APP_URL`, and generate the session secret and sandbox operator password with `openssl rand -hex 32` for each. An empty `DATABASE_URL` uses local PGlite in development. Set `DATABASE_URL` to your own PostgreSQL 17 database for a production server. Then run `npm run db:migrate`, `npm run db:seed` and `npm run dev`. Provider testing requires your own sandbox accounts, Gemini project and applicable Studio licence. Use your own canonical HTTPS endpoint for genuine callbacks and authorize each sandbox payment test separately. [Environment reference](docs/ENVIRONMENT.md)

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run secrets:check
```

Point `DATABASE_URL` at a disposable PostgreSQL 17 database named `classequity` for `npm run test:financial:concurrency`. The harness creates an isolated schema and uses a loopback fake provider. Follow the demo guide to run `npm run test:e2e` with local synthetic data, or use the CI workflow to reproduce the production-mode test setup. The separate hosted Playwright config runs presentation and authorization checks. [Test and demo guide](docs/DEMO_GUIDE.md) · [CI workflow](.github/workflows/ci.yml)

## Integration evidence

- **PayPal Sandbox.** The hosted $1 capture and full refund have independent provider readbacks and three genuine signed callbacks. PayPal retained $0.54 in fees. Duplicate capture requests and genuine event resends preserved the ledger. [Hosted verification](docs/HOSTED_WEBHOOK_VERIFICATION.md)
- **Gemini and AG Studio.** Earlier configured tests observed Gemini quotation extraction, parent assistance and agent-created editable reports. The hosted tour and fictional workspace use local or recorded examples. The restricted hosted Gemini adapter is configured, and its hosted generation verification is pending billing-tier confirmation. [Architecture](docs/ARCHITECTURE.md) · [AG Studio integration](docs/AG_STUDIO_INTEGRATION.md)
- **Twilio and APIMatic.** Twilio confirmed delivery of one authorized WhatsApp Sandbox message sent through the ClassEquity adapter. Hosted callback delivery remains unverified. APIMatic context informed both API integrations and the official PayPal server SDK is APIMatic-generated. [Twilio integration](docs/TWILIO_INTEGRATION.md) · [APIMatic integration](docs/APIMATIC_INTEGRATION.md)

[Product story](docs/PRODUCT_STORY.md) · [Security and limitations](docs/SECURITY.md) · [Submission materials](docs/SUBMISSION_DRAFT.md) · [Release identity](docs/RELEASE_MANIFEST.json) · [MIT licence](LICENSE)

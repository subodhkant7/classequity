# Environment and operations

Use Node 22.23.1 and `npm ci`. TypeScript 6 is pinned for compatibility with typescript-eslint; the latest TypeScript 7 compiler caused a verified linter incompatibility. AG Studio and React wrapper are both 3.1.0; Grid packages are 36.3.0, matching Studio's transitive Grid dependency.

Copy `.env.example` to `.env` for a clean setup. The local prepared `.env` is ignored, mode 0600, and contains the discovered provider credentials, the existing Render database connection, and freshly generated session/admin secrets. Never display or commit its contents. Retrieve the local sandbox password privately from `ADMIN_PASSWORD`; demo role entry needs no password. Do not use the demo role selector as real school identity management.

Required: APP_URL (exact browser origin), SESSION_SECRET (32+ characters), ADMIN_PASSWORD (16+ characters for sandbox), DATABASE_URL in production. Empty DATABASE_URL locally enables durable PGlite. `npm run db:migrate`, then `npm run db:seed`, then `npm run dev`. Use http://localhost:3000 consistently; 127.0.0.1 is a different origin and cannot bypass CSRF. Production: `npm run build && npm start`. Builds initialize no database connection; DATABASE_URL is enforced when production database services are first used. Both a database-free build and an isolated durable PGlite migration/seed were verified.

Optional provider variables are listed in `.env.example`. PAYPAL_ENV must be sandbox. Gemini discovery consults the account model list, then selects configured supported Flash models; `gemini-2.5-flash-lite` generated a real response during the build. A model appearing in discovery is not proof generation works (2.5 Flash returned 404). Missing/failed AI uses a labeled grounded local parent-information fallback; quote extraction reports an actionable error and pricing can be entered manually.

## Existing database

Render workspace My Workspace, database `classequity-db`, database name `classequity`, PostgreSQL 17, Singapore, free plan; resource `dpg-dblpk3qfngtc73bv3ba0-a`. Initial read-only schema inspection found no user tables. The connection came from authenticated Render CLI sensitive connection metadata, saved directly into ignored `.env` without printing it. The non-destructive migration was then applied and seed data inserted. Existing rows are never reset by seed. No duplicate database or upgrade was created. Free database currently expires December 4, 2026; confirm availability before judging.

The migration runner verifies the intended database name, rejects DROP/TRUNCATE SQL, holds an advisory lock, records checksums, and executes migration statements transactionally. Do not target another project's database. For an explicitly local PostgreSQL database with a different name, set ALLOW_LOCAL_DATABASE=true. Review every generated migration before applying it.

## Hosting

The free Singapore Node service is `classequity` at https://classequity.onrender.com, in the user-confirmed My Workspace. There are no project containers; both database and web service are workspace-level resources. The service uses the existing database's internal URL. `render.yaml` is the reviewed configuration reference, not an active Blueprint sync: the single existing-database web service was created directly and its settings verified through Render. No duplicate database is declared or created. Auto-deploy and preview deployment are off; private branches are deployed manually without merging.

GitHub authentication and the private repository are now available. PR #1 and #2 remain unmerged; hosted changes use `codex/hosted-webhook-verification` and draft PR #3. See `HOSTED_WEBHOOK_VERIFICATION.md` for the exact deployed revision and observed status.

The start command is only `npm start`. `npm run release:check` runs during the build and uses an explicitly read-only transaction to check the existing migration ledger and fictional schools. No migration or seed runs on startup, restart or cold start. A schema mismatch stops the build; reviewed migrations must be applied separately. The local migration runner now normalizes PGlite raw-result envelopes, checks prior hashes after taking the advisory lock, and is tested through repeated setup without resetting data.

Hosted variables include the actual HTTPS APP_URL, private internal DATABASE_URL, existing SESSION_SECRET/ADMIN_PASSWORD, DEMO_MODE=true, HOSTED_RESTRICT_PUBLIC_AI=true, PAYPAL_ENV=sandbox, existing PayPal sandbox and Gemini credentials, and PAYPAL_WEBHOOK_ID after registration. Values are transferred privately and never printed. The supplied Studio trial is omitted pending confirmed public-use scope; real evaluation components remain available. Twilio credentials are omitted because no live message test is authorized. Provider credentials are not rotated or altered.

Free hosts can spin down after 15 idle minutes. There is no persistent local storage, SSH or paid pre-deploy job; PostgreSQL is the durable store. Database readiness is checked at `/api/health`. A private local custom-format backup was created before deployment; preserve it privately before the free database expires. Backup restoration has not been tested. No paid upgrade or replacement database is authorized.

# Environment and operations

Use Node 22.23.1 and `npm ci`. TypeScript 6 is pinned for compatibility with typescript-eslint; the latest TypeScript 7 compiler caused a verified linter incompatibility. AG Studio and React wrapper are both 3.1.0; Grid packages are 36.3.0, matching Studio's transitive Grid dependency.

Copy `.env.example` to `.env` for a clean setup. The local prepared `.env` is ignored, mode 0600, and contains the discovered provider credentials, the existing Render database connection, and freshly generated session/admin secrets. Never display or commit its contents. Retrieve the local sandbox password privately from `ADMIN_PASSWORD`; demo role entry needs no password. Do not use the demo role selector as real school identity management.

Required: APP_URL (exact browser origin), SESSION_SECRET (32+ characters), ADMIN_PASSWORD (16+ characters for sandbox), DATABASE_URL in production. Empty DATABASE_URL locally enables durable PGlite. `npm run db:migrate`, then `npm run db:seed`, then `npm run dev`. Use http://localhost:3000 consistently; 127.0.0.1 is a different origin and cannot bypass CSRF. Production: `npm run build && npm start`. Builds initialize no database connection; DATABASE_URL is enforced when production database services are first used. Both a database-free build and an isolated durable PGlite migration/seed were verified.

Optional provider variables are listed in `.env.example`. PAYPAL_ENV must be sandbox. Gemini discovery consults the account model list, then selects configured supported Flash models; `gemini-2.5-flash-lite` generated a real response during the build. A model appearing in discovery is not proof generation works (2.5 Flash returned 404). Missing/failed AI uses a labeled grounded local parent-information fallback; quote extraction reports an actionable error and pricing can be entered manually.

## Existing database

Render workspace My Workspace, database `classequity-db`, database name `classequity`, PostgreSQL 17, Singapore, free plan; resource `dpg-dblpk3qfngtc73bv3ba0-a`. Initial read-only schema inspection found no user tables. The connection came from authenticated Render CLI sensitive connection metadata, saved directly into ignored `.env` without printing it. The non-destructive migration was then applied and seed data inserted. Existing rows are never reset by seed. No duplicate database or upgrade was created. Free database currently expires December 4, 2026; confirm availability before judging.

The migration runner verifies the intended database name, rejects DROP/TRUNCATE SQL, holds an advisory lock, records checksums, and executes migration statements transactionally. Do not target another project's database. For an explicitly local PostgreSQL database with a different name, set ALLOW_LOCAL_DATABASE=true. Review every generated migration before applying it.

## Hosting

`render.yaml` defines a free Node service only and references no new database. Set all secrets privately, use the existing database's internal URL for the deployed service, set APP_URL to the final Render HTTPS origin, and register webhooks only after deployment exists. Free services may cold-start; provider readback supports initial testing while webhook delivery is being configured. No chargeable resources are authorized by this configuration.

GitHub CLI was initially signed out, and the connector has no repository-creation tool. A browser check also reached GitHub sign-in. Until authentication is supplied, private repository creation/push and source-based Render deployment are blocked. No public repository is permitted. The app remains locally runnable against the real Render database.

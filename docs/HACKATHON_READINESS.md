# Hackathon release readiness

Submission closes November 12 at noon Pacific, or November 13 at 01:30 IST. Judging ends December 15 at 08:00 Pacific, or 21:30 IST. The rules accept a functional hosted demo or complete setup instructions and require public source with a detectable open-source licence. [Official rules](https://paypalaihackathon.devpost.com/rules)

## Judge access

| Surface                                           | What judges can exercise                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public homepage, calculators and six-chapter tour | Client-side scenarios, recorded sandbox evidence, explicitly illustrative or recorded AI, and editable native Studio on sample aggregates                                                                                                                                 |
| Demo accounts from `/login`                       | Read-only canonical Oakwood Academy server dataset (`$157.70` gap), browser-local interactive simulations (`sessionStorage`), per-session rate-limit buckets, role restrictions, and `403 DEMO_READ_ONLY` write guards so concurrent judges cannot contaminate each other |
| Restricted sandbox                                | Password-protected operator access, tenant isolation and authenticated Gemini adapter. Judge access uses demo accounts instead of operator credentials.                                                                                                                   |
| Clean local showcase                              | `npm ci` and `npm run showcase`, which build a reproducible local demo workspace at localhost:3100                                                                                                                                                                        |

The first hosted browser run encountered Render's cold-start screen and delayed asset loading. A new session after health readiness passed all ten hosted checks. The anonymous tour issued zero application or external requests and had zero uncaught page errors. The console displayed AG Studio’s vendor trial notice. The [historical release manifest](RELEASE_MANIFEST.json) records that earlier PR #4 / `e673ad86...` baseline; subsequent public-demo isolation, P0 Finance fetch-loop closure, and current CI/deployment checks are recorded separately in GitHub Actions and runtime verification reports.

## Provider verification

Genuine PayPal Sandbox approval, capture and refund callbacks were verified previously, including independent readback and genuine redelivery. The release preservation read compared the complete sandbox ledger to the previous fingerprint. [Hosted webhook report](HOSTED_WEBHOOK_VERIFICATION.md)

On November 11, the hosted Gemini assistant (`gemini-2.5-flash-lite`) answered in English and Hindi through the restricted sandbox. The hosted PDF extraction returned HTTP 502 and the hosted Studio agent was untested. The earlier isolated application verified PDF extraction and native editable AG Studio report generation. The PNG issuer remains unreliable and requires review. Public judges can use grounded local answers and the labeled recorded or illustrative tour examples. [Hosted Gemini verification](HOSTED_GEMINI_VERIFICATION.md) · [Local provider verification](PROVIDER_LIVE_VERIFICATION.md)

Twilio confirmed delivery of one authorized WhatsApp Sandbox message sent through the ClassEquity adapter after the receiver rejoined. Local signed fixtures verify pairing, replay and delivery-status handling. The hosted routes previously rejected unsigned requests, and genuine hosted callbacks remain unverified. [Provider verification](PROVIDER_LIVE_VERIFICATION.md) · [Hosted callback checklist](TWILIO_INTEGRATION.md)

## Database continuity

Render reported the existing PostgreSQL 17 instance available on the paid `0.1c-256mb` plan on November 10, 2026, with no expiration reported. The original free-plan deadline was December 5 at 02:18 IST.

Both the pre-deployment archive and a fresh private `pg_dump` custom archive were restored into separate local PostgreSQL 17.11 databases. The archive includes 25 ClassEquity tables and three applied migrations. Restore with `pg_restore --exit-on-error --single-transaction --no-owner --no-acl` into a fresh database using its owner role. The rehearsal used a private loopback cluster and required only the standard `plpgsql` extension. The fresh archive retains the two refunded captures, retained fees and three processed signed PayPal events. Migration checksums match the repository SQL. Keep archives private and make a fresh archive before any cutover.

Use the tested local showcase as the independent judge fallback for the full judging period. If a database cutover is ever needed, export a fresh private backup, restore it into an empty PostgreSQL 17 target, compare migration checksums, the ledger and inbox fingerprints, then run the read-only release preflight. After an approved connection switch, verify health, hosted role access and the existing webhook receiver.

## Publication and submission

Review the final release manifest and third-party notices. The source has a canonical MIT licence and depends on commercial AG Studio packages under vendor terms. AG Grid describes a judging-period evaluation arrangement. Check coverage for broader public operation with the vendor. [Third-party notices](../THIRD_PARTY_NOTICES.md)

The source audit used Gitleaks plus a targeted scan of reachable Git blobs against configured credentials, private handoff identifiers and artifact patterns. An early redacted-evidence file carried an internal application operation UUID. It was replaced at the release tip by a fingerprint. The historic ID is an internal correlation value and every operation lookup requires authorization. The other internal matches identify fictional fixtures. No checkout URL, buyer detail or credential was found in the audited history. The tracked binary assets are original quote and social-preview exports. Browser sessions and database archives are excluded from source.

The repository is published publicly at `https://github.com/subodhkant7/classequity`; supply this public source URL and the final YouTube URL for manual Devpost entry. Use the tested clean local setup as an alternate access path and attach the five reviewed application screenshots. The historical manifest records their checksums. [Submission package](SUBMISSION_DRAFT.md)

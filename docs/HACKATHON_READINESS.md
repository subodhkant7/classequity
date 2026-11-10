# Hackathon release readiness

Submission closes November 12 at noon Pacific, or November 13 at 01:30 IST. Judging ends December 15 at 08:00 Pacific, or 21:30 IST. The rules accept a functional hosted demo or complete setup instructions and require public source with a detectable open-source licence. [Official rules](https://paypalaihackathon.devpost.com/rules)

## Judge access

| Surface                                           | What judges can exercise                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public homepage, calculators and six-chapter tour | Client-side scenarios, recorded sandbox evidence, explicitly illustrative or recorded AI, and editable native Studio on fictional aggregates              |
| Fictional roles from `/login`                     | Actual persisted demo workflow for school, family and finance, with synthetic payments and role restrictions                                              |
| Restricted sandbox                                | Password-protected operator access, tenant isolation and authenticated Gemini adapter. Judge access uses fictional roles instead of operator credentials. |
| Clean local showcase                              | `npm ci` and `npm run showcase`, which build a reproducible fictional workspace at localhost:3100                                                         |

The first hosted browser run encountered Render's cold-start screen and delayed asset loading. A new session after health readiness passed all ten hosted checks. The anonymous tour issued zero application or external requests and had zero uncaught page errors. The console displayed AG Studio’s vendor trial notice. The release manifest records the tested revision, counts and evidence. [Release manifest](RELEASE_MANIFEST.json)

## Provider verification

Genuine PayPal Sandbox approval, capture and refund callbacks were verified previously, including independent readback and genuine redelivery. The release preservation read compared the complete sandbox ledger to the previous fingerprint. [Hosted webhook report](HOSTED_WEBHOOK_VERIFICATION.md)

Real Gemini generation was verified with the local credentials on November 10. The isolated application verified English and Hindi parent responses, structured quotation extraction from the original fictional quote rendered to PDF, and a native editable AG Studio report. The PNG issuer remained unreliable and requires review. Hosted generation remains unverified. [Provider verification](PROVIDER_LIVE_VERIFICATION.md)

Twilio confirmed delivery of one authorized WhatsApp Sandbox message sent through the ClassEquity adapter after the receiver rejoined. Local signed fixtures verify pairing, replay and delivery-status handling. The hosted routes previously rejected unsigned requests, and genuine hosted callbacks remain unverified. [Provider verification](PROVIDER_LIVE_VERIFICATION.md) · [Hosted callback checklist](TWILIO_INTEGRATION.md)

## Database continuity

The existing Singapore PostgreSQL 17 instance is available. The free plan's 30-day lifetime ends December 5 at 02:18 IST. Its grace period is for a paid upgrade and does not keep the database accessible. Render allows one active free PostgreSQL instance per workspace. [Render free plan](https://render.com/docs/free#free-postgres) · [Free instance replacement policy](https://render.com/changelog/free-postgresql-instances-now-expire-after-30-days-previously-90)

Both the pre-deployment archive and a fresh private `pg_dump` custom archive were restored into separate local PostgreSQL 17.11 databases. The archive includes 25 ClassEquity tables and three applied migrations. Restore with `pg_restore --exit-on-error --single-transaction --no-owner --no-acl` into a fresh database using its owner role. The rehearsal used a private loopback cluster and required only the standard `plpgsql` extension. The fresh archive retains the two refunded captures, retained fees and three processed signed PayPal events. Migration checksums match the repository SQL. Keep archives private and make a fresh archive before any cutover.

Use the tested local showcase as the independent judge fallback for the full judging period. For continuity at the hosted URL, the owner can approve a paid upgrade of the existing database before expiry, or approve provisioning a replacement and switching the web service's database connection. A replacement in the same workspace on the free plan can be created only after the current instance expires, so it entails an interruption. An earlier cutover requires an authorized compatible provider or eligible workspace. Rehearse with PostgreSQL 17 and sufficient storage, export a fresh private backup, restore into an empty target, compare migrations, ledger and inbox fingerprints, then run the read-only release preflight. After an approved connection switch, verify health, hosted role access and the existing webhook receiver. Preserve the old archive and connection recovery details. No availability guarantee extends the present free database past its expiry.

## Publication and submission

Review the final release manifest and third-party notices. The source has a canonical MIT licence and depends on commercial AG Studio packages under vendor terms. AG Grid describes a judging-period evaluation arrangement. Check coverage for broader public operation with the vendor. [Third-party notices](../THIRD_PARTY_NOTICES.md)

The source audit used Gitleaks plus a targeted scan of reachable Git blobs against configured credentials, private handoff identifiers and artifact patterns. An early redacted-evidence file carried an internal application operation UUID. It was replaced at the release tip by a fingerprint. The historic ID is an internal correlation value and every operation lookup requires authorization. The other internal matches identify fictional fixtures. No checkout URL, buyer detail or credential was found in the audited history. The tracked binary assets are original quote and social-preview exports. Browser sessions and database archives are excluded from source.

Approve repository visibility separately and supply the public source URL and final YouTube URL for manual Devpost entry. Use the tested clean local setup as an alternate access path and attach the five reviewed application screenshots. The manifest records their checksums. The separately exported source archive includes the setup, assets, licence and integration evidence. [Submission package](SUBMISSION_DRAFT.md)

# ClassEquity public-source publication checklist

**Release status: PRIVATE / AWAITING OWNER APPROVAL.** This document prepares a publication review; it does **not** authorize making GitHub public, deployment, payment actions, YouTube upload or Devpost submission.

## 1. Publication gates

- [ ] Confirm the final documentation PR has passed GitHub Actions and has been reviewed and merged into `main`.
- [ ] Independently verify the intended `main` commit and that any live deployment still identifies its own deployed SHA. Do not claim source and runtime are identical if they are not.
- [ ] Re-run the repository's `npm run secrets:check` and a **full reachable Git history / all-ref Gitleaks scan** at the final publish commit. Review historic files, tags, git objects referenced by branches, action artifacts and generated release archives as separate surfaces.
- [ ] Confirm no `.env`, private keys, real credentials, bearer/session cookies, customer/buyer identifiers, personal phone numbers, status-callback signing secrets, database dumps, provider approval URLs, Playwright sessions or raw webhook payloads are public.
- [ ] Account for the previously committed internal operation correlation ID in historical Git objects. It was redacted at the release tip, but publishing the same full Git history can expose the old value. The identifier is not a credential; evaluate whether the associated record can be queried or mutated without a separate authorization check before approving publication.
- [ ] Verify the prior disposable test session is revoked and no reusable cookie survives in a public log, artifact or document.
- [ ] Review `LICENSE`, `THIRD_PARTY_NOTICES.md` and vendor licence scope. ClassEquity is MIT; **AG Studio, AG Grid Enterprise and AG Charts Enterprise are not relicensed by MIT**.
- [ ] Verify the exact archive intended to be published is reproducible from the audited source, excluding `output/`, `.data/`, `.env*` (except `.env.example`), credentials, private logs and backups.
- [ ] Confirm the final README clone, `npm ci && npm run showcase`, demo account login and interactive charts with a clean environment.
- [ ] Confirm the README environment template matches checked-in `.env.example`, local and hosted code constraints, and the Render deployment configuration. Review any historical branch in `render.yaml` before Blueprint usage.
- [ ] Confirm the deployed HTTPS app and `/api/health` still work with its existing paid PostgreSQL database; review backup/restore readiness, DB IP allowlist, and remaining web cold-start behavior.
- [ ] Check that README, Devpost and video distinguish the verified hosted Gemini assistant, local Gemini quotation and Studio results, PayPal Sandbox proof, local Twilio outbound delivery, and simulated demo interactions. [Hosted Gemini verification](HOSTED_GEMINI_VERIFICATION.md)

## 2. Evidence boundary

| Feature | What was verified | What must not be claimed |
| --- | --- | --- |
| PayPal | Genuine hosted Sandbox approval/capture/refund callbacks, provider readback, duplicate/redelivery protection and retained-fee reconciliation | Live-money processing, real school adoption, or new transactions while visiting the public tour |
| Gemini | Genuine hosted English and Hindi assistance, plus local PDF extraction and local editable AG Studio agent reports | Successful hosted PDF extraction, hosted Studio agent generation or autonomous payment or assistance decisions |
| Twilio | One authorized real outbound WhatsApp Sandbox message provider-confirmed `delivered` | Verified genuine hosted inbound/status callbacks or universal production messaging |
| AG Studio | Native report widgets and actual editable UI | MIT licence of commercial Enterprise dependencies or unrestricted usage |
| Public roles | Sample school/parent/finance workflows; browser-local illustrations | Production identity assurance or personal-data readiness |
| Render | HTTPS web service and independently confirmed paid PostgreSQL instance | Guaranteed zero downtime, every source commit deployed, or complete production hardening |

## 3. Manual publication and submission order

1. Owner confirms the documentation merges and GitHub Actions results before approving publication.
2. Owner completes the final full-history/secret/licence checks immediately before publication.
3. Owner changes the repository visibility in GitHub to **Public**, then opens the URL in a signed-out browser.
4. Owner checks public README links, `LICENSE` recognition, `.env.example`, reproducibility and hosted demo access from a clean browser.
5. Owner uploads the reviewed final under-three-minute video to YouTube as **Public** and validates logged-out playback and subtitles. Do not upload private raw recordings.
6. Owner copies the public GitHub and YouTube links into Devpost, attaches reviewed screenshots, verifies English text and eligibility, then manually submits **before the hackathon deadline**.
7. Owner preserves the paid database and monitors the hosted service through judging. No automated payments/refunds or API smoke tests without separate authorization.

## 4. Known boundaries that do not silently disappear on publication

- Existing Render service uses manual deployments and may cold-start; deployment SHA can trail `main`.
- The shared-password sandbox operator is hackathon-only, not commercial authentication.
- Hosted Gemini PDF extraction returned HTTP 502, hosted Studio agent generation was untested, and genuine hosted Twilio callbacks remain unverified.
- Quote PNG issuer extraction can require manual entry.
- AG Studio/Enterprise licence terms govern usage beyond permitted evaluation.
- External PostgreSQL IP allowlisting and production privacy/security hardening require further work.
- The owner-controlled final public video URL and Devpost submission are **not yet recorded**.

## 5. Hold points

**Do not publish** if a reusable credential, personal data, unreviewed commercial redistribution obligation, unsafe historical object, or critical functional regression is detected. Record the exact blocker and resolve it before making the repository public.

**Do not update the deployed service merely because docs are merged.** Any deployment or environment-variable change requires a separate source/deployment review, compatibility checks, and rollback strategy.

For public installation and deployment settings see [README](../README.md); for design details see [Architecture](ARCHITECTURE.md) and [Security](SECURITY.md).

# Hosted Gemini verification on Render

**Classification:** `HOSTED_GEMINI_PARTIALLY_VERIFIED`

Two real Gemini responses were verified through the deployed ClassEquity assistant. Hosted PDF extraction failed and the Studio agent was left untested. Earlier direct provider and isolated application results are recorded separately. [Local Gemini and Twilio verification](PROVIDER_LIVE_VERIFICATION.md)

## Runtime and access

The hosted requests ran on November 11, 2026 from `08:57:24.942Z` to `08:57:44.028Z` against the Render service `classequity` at [classequity.onrender.com](https://classequity.onrender.com). Render reported a live deployment of `e673ad86537315167037f877386be6a9ede599ad`. The live build logs confirmed Node.js `22.23.1`. HTTPS `/api/health` returned 200 with `database: ready` and that SHA before and after the probe. The revision was an ancestor of private `main` at `6c629f2eff8cbfdde581f5bbbdb434c7aa4cb81e`, which contains subsequent source and documentation changes. Render deploys manually.

The legitimate password-protected finance session was scoped to the seeded fictional sandbox school. A separate fictional public demo session returned `Grounded local assistant` with a null model and HTTP 200 even with `useAI=true`. Its Studio turn request returned HTTP 403 with `PUBLIC_PROVIDER_DISABLED`. The authenticated integrations route confirmed Gemini key presence. Both test sessions were revoked and their cookies returned HTTP 401 on readback.

## Hosted requests

| Workflow | Observed result | Classification |
| --- | --- | --- |
| English assistant, `POST /api/assistant` | HTTP 200, `Gemini · school-grounded`, `gemini-2.5-flash-lite`. The non-empty English answer gave November 20, 2026 and USD 32 per seat. | Verified hosted generation |
| Hindi assistant, `POST /api/assistant` | HTTP 200, the same source and model. The non-empty Devanagari answer gave the same date and price. | Verified hosted generation |
| PDF quotation, `POST /api/trips/{id}/quotations` | HTTP 502, `INVALID_REQUEST`. The hosted assessment recorded `QUOTE_EXTRACTION` as `FAILED` for `gemini-2.5-flash-lite`. The follow-up read found no new `REVIEW` record. | Attempted, unverified |
| AG Studio agent, `/api/studio/turn` | The sandbox finance account already had a saved report. The deployed client also supplies per-operation IDs and statuses in its default summary tool payload. The sandbox account and existing report were left in place. | Untested, zero authenticated provider turns and zero report writes |

There were three controlled provider-eligible application requests. The two assistant requests produced completed `PARENT_ASSISTANT` assessments, and the quotation request produced one failed assessment. For each language, the probe separately requested `useAI=false` using the same question. The hosted answers differed from their corresponding deterministic responses after whitespace normalization. Both matched the frozen price and date from the sandbox, and neither disclosed private assistance or individual payment information.

The fictional PDF names Exploratorium Learning Visits and quotes USD 32, 27 and 23 at 1, 20 and 30 participants. The hosted error prevented confirmation of any extracted issuer or tier. The deployed code maps generation and structured-output errors to the same HTTP 502 response. The assessment and available Render logs gave no more specific cause. The PDF was submitted once. Successful isolated PDF extraction and the separate PNG issuer limitation still apply. Review and activation require a human, and no activation was attempted.

The public tour uses recorded or illustrative examples. The earlier isolated Studio verification used a genuine editable report, and the hosted browser checks for the standard native analytics are recorded separately from agent generation. [Release manifest](RELEASE_MANIFEST.json)

## State preservation

Read-only PostgreSQL comparisons at `08:56:28Z` and `08:58:54Z` matched row counts and sorted row fingerprints across all 11 scoped tables. The comparison covered trips and pricing policies, registrations, consent, assistance, sponsor commitments, frozen snapshots, obligations, payment operations, captures and fees, refunds, and school contributions. The sandbox still had two captures, two refunds, three payment operations, and three consent records. Assistance, sponsor commitment and school contribution tables had zero rows in the sandbox scope at both reads. The authenticated dashboard, analytics, finance and registration projections also matched.

The probe created disposable sessions, normal usage counters and three assessment records. It created no quotation or report, issued no PayPal request, sent no WhatsApp message and changed no Render settings or deployment. The evidence here contains no credentials, raw responses, session artifacts or private records.

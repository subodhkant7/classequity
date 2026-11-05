# Experience acceptance

Baseline: `c58de0eadecd902995cd99699063f44162389ff1`. Branch: `codex/hackathon-experience-polish`. No deployment, merge, credential modification or actual provider transaction is part of this phase.

## Public experience

| Surface          | Acceptance action                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage         | Purpose and both main CTAs visible in opening viewport; original scene; four pillars, AI workflows, six previews, boundaries and footer              |
| Pricing          | Keyboard range reaches 19/20/29/30 boundaries; 30 seats shows $23, $690 total and $270 difference; next threshold and estimate caveat visible        |
| Funding          | Starts with $157.70 shortfall; increasing commitments alone leaves net unchanged; confirmed money and fees change net; reset restores fixture        |
| Payment states   | Choose unknown, verified or refunded illustration; duplicate example does not add cash; recorded $1 proof remains separate                           |
| Six-chapter tour | Planning → quote review → consent/participation → aggregate support → payment evidence → actual Studio; navigation, replay/reset and deep links work |
| Privacy          | Public role selector changes an explanation, never access; no assistance-recipient mapping, actual token or buyer/provider identifier exists         |
| Studio           | Existing component renders actual custom widgets, native chart/grid and recorded comparison replay without `/api/` requests in public mode           |
| Real app links   | `/login`, `/trips`, `/parent` and `/analytics` keep actual authorization; the tour does not silently authenticate visitors                           |

## Application and motion

Application shell, login, parent, trips, registrations, sponsorship, finance, messages, analytics and settings inherit shared control/surface/typographic refinements. Operational flows remain real. Native dialog focus containment/Escape/return and mobile drawer behavior are checked in browser tests. Provider state machines, integer-cent calculations, database models and server authorization remain unchanged.

At 390px the document must fit; analytical canvases/tables may have bounded internal scrolling. Reduced-motion mode and the tour skip control must disable decorative motion while retaining all information. No hidden scroll-reveal content or continuous CPU animation is accepted.

## Verification records

- Existing 39 financial/service/domain/Twilio tests retained; six focused presentation tests added (45 total).
- Twelve browser tests cover the original five workflows plus seven presentation/accessibility flows. Test results are stored under ignored `output/playwright/results.json`; captures are under `output/playwright/showcase/`.
- QA runs on a separate port with `DATABASE_URL=''`, a dedicated `.data/experience-qa` PGlite directory and `.next-experience` build directory. Gemini is disabled in that process. No shared database is reset or written.
- Typecheck, lint, production build and secret scan must pass before push. Observed final local results: typecheck, lint, 45 unit/service tests, 12 browser tests, database-independent production build and secret scan all passed. See `HACKATHON_READINESS.md`, `experience-verification.json` and the delivery report.
- Keyboard/semantic/reflow automation is not a full human screen-reader audit; assistive-technology review remains a release follow-up.

## Explicit scope exception

The request's section 11 says “Do not prepare anything for demo video. I will prepare the demo by myself.” That specific instruction supersedes the later generic VIDEO_STORYBOARD and video acceptance bullets. No storyboard, video script, recording, timing plan or video asset is produced. This is an intentional exclusion, not an unreported deliverable.

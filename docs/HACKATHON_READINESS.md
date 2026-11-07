# Hackathon experience readiness

## Implemented for local evaluation

- Public homepage, interactive explanation, six-chapter guided demo and technology/evidence page.
- Deterministic pricing/funding illustrations, local quote review and consent interaction, privacy perspectives and payment-state exploration.
- Existing real AG Studio component in public presentation mode: synthetic aggregates, cloud AI disabled, persistence disabled. Authenticated Studio behavior is retained.
- Finite CSS motion, reduced-motion and skip controls, keyboard navigation, responsive menu, native accessible application dialog and mobile drawer handling.
- Project/story/website/design/acceptance documentation, revised README and submission review draft.
- Original SVG identity/social assets and real browser captures. Derived application screenshots remain ignored.

## Evidence boundary

| Capability              | Honest status                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Public experience       | IMPLEMENTED; browser verification recorded in delivery report                                                              |
| PayPal sandbox          | Prior genuine $1 capture/refund/duplicate proof preserved; no transaction performed in this phase                          |
| Gemini                  | Prior generation, extraction and report-agent evidence preserved; public tour uses labeled illustrations/recorded outcomes |
| AG Studio / AG Grid     | Real framework components, not screenshot substitutes                                                                      |
| Twilio                  | Adapter/authentication implemented; actual delivery unverified                                                             |
| APIMatic                | Contract-guided development and generated official PayPal SDK; not runtime processing                                      |
| Render                  | Free HTTPS application at https://classequity.onrender.com; existing PostgreSQL preserved                                  |
| Signed public callbacks | Sandbox callback registered; genuine signed event/reconciliation gate tracked separately in HOSTED_WEBHOOK_VERIFICATION.md |
| Production release      | Requires identity/treasury/audit/operations hardening and broader accessibility review                                     |

## Experience-phase verification (historical)

Starting financial tests: 39. Added presentation tests: 6. Verified current unit/service total: **45 passed across five files**. Browser suite: **12 passed** (original 5 retained plus public/accessibility coverage). Typecheck, lint (zero warnings), production build with DATABASE_URL empty, and secret scan passed. Browser QA was run at desktop and 390px with optional local trace storage disabled after a disk-space failure; all assertions were retained. Motion-frame, reduced-motion and representative contrast measurements are in `experience-verification.json`. Exact final CI URL and commit are in the delivery report. No provider integration smoke command is needed for this presentation-only phase; it would add external calls without verifying a UI change.

The later hosted phase authorizes the free sandbox deployment and exact callback registration. Deployment source, current CI, nine production browser checks, restart/persistence checks and outstanding genuine event proof are recorded in `HOSTED_WEBHOOK_VERIFICATION.md`. Public demo cloud AI is restricted; Twilio credentials and the unconfirmed public-use Studio trial are omitted. No paid upgrade, live payment, automatic submission, repository publication or merge is authorized. PR #1 and #2 remain unmerged; draft PR #3 targets the experience branch. A new capture/refund requires a new exact-amount authorization and manual buyer approval; the prior USD 1 authorization is consumed.

No video preparation is included, as explicitly requested. VIDEO_STORYBOARD.md is intentionally not created. Existing sandbox proof is a technical verification example, not adoption or real school-impact evidence.

## Hosted follow-up verification

Runtime revision `a61375f32a7e69d9c8c53f20676dfa7d909a6811` is deployed. Complete CI passed 60 unit/service tests, six independent-process financial concurrency scenarios and all 12 browser checks against the production server. Nine production HTTPS smoke checks passed, including 390px/reduced motion, public-tour isolation, authorization, webhook configuration and painted native Studio cells with exact currency precision. Original sandbox ledger rows are unchanged. The new USD 1 order awaits manual approval and a new capture/refund authorization; genuine signature/delivery/resend evidence remains unverified. Details and exact CI link: `HOSTED_WEBHOOK_VERIFICATION.md`.

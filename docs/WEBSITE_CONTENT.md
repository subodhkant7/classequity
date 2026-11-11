# Website content and claim audit

## Positioning

Primary tagline: **Every child belongs on the trip. Every payment is accounted for.**
Hero: **Every child deserves a place in the adventure.**
Supporting message: Plan school activities, unlock better group prices, protect families’ privacy, and know exactly when every seat is funded.

Primary entry is **Explore Interactive Demo**, which opens `/demo` without login or provider credentials. **See How It Works** opens `/how-it-works`. **School workspace** opens `/login`, the separate functional application. The product addresses school administrators, parents and finance coordinators; the public tour introduces all three perspectives without disclosing support-recipient mappings.

## Implemented page progression

- `/`: illustrated museum/bus scene and working price control; fragmented-workflow explanation; four solution pillars; three interactive AI workflow illustrations; six application-derived product previews; privacy/financial boundaries; final CTA and limitation-aware footer.
- `/how-it-works`: deterministic registration calculator, adjustable funding/assistance simulation and payment-state explorer. Every interaction is local. Estimates are distinguished from frozen obligations.
- `/demo`: six freely navigable chapters with clear outcomes, next/previous, chapter deep links, replay, motion skip, reset, keyboard focus and final workspace link.
- `/technology`: accurate PayPal/Gemini/Twilio/AG Studio/APIMatic/Render roles, financial/human boundary diagram, source documentation links and explicit verification limitations.

## Content sources

| Claim / display                                      | Source and scope                                                                                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| $32/$27/$23 tiers at 1/20/30 students                | Sample vendor quotation fixture `public/sample-vendor-quote.svg`; recorded Gemini extraction in `docs/ai-evidence.json`; existing `seatPrice` function      |
| 30 × $23 = $690; $270 difference from $32 baseline   | Deterministic `pricingExample`, wrapping the actual integer-cent domain function                                                                            |
| Five fully assisted seats need $115                  | Five × $23; no recipient names or eligibility mappings are published                                                                                        |
| $553 gross / $20.70 fees / $532.30 net / $157.70 gap | Sample demonstration cohort, calculated by the actual `funding` function; not a claim about current mutable shared records                                  |
| $1 capture / $1 refund / $0.54 fee / −$0.54 net      | Redacted real sandbox evidence in `docs/financial-lifecycle-evidence.json`; recorded, not a fresh public transaction                                        |
| Gemini quotation intelligence                        | Recorded extraction labeled as such; review checkbox changes only browser state                                                                             |
| English/Hindi parent assistance                      | Public dialogue is an illustrative approved-information example; authenticated real assistant remains separate                                              |
| Editable AG Studio                                   | Actual existing component with sample aggregate fixtures; public mode disables cloud AI and saved-state API calls                                           |
| Recorded AI report replay                            | A local replay of a native report template, clearly labeled; actual prior Gemini tool execution is in `docs/studio-agent-evidence.json`                     |
| Twilio                                               | Adapter/authentication verified; live message delivery unverified                                                                                           |
| APIMatic                                             | Contract-guided development and generated PayPal SDK, not a runtime payment processor                                                                       |
| Render                                               | Free HTTPS application and existing PostgreSQL; genuine signed sandbox callbacks and replay verification recorded separately                                |

No impact statistics, testimonials, customer logos, partnerships, compliance certifications or AI payment-authority claims are used. Integration names identify actual tooling; they do not imply endorsement. Source links point into the private repository and require access.

## Media

Museum/bus/learner illustration and social-preview SVG are original vectors authored for this product. Icons use the already-installed Lucide library. No stock photograph, purchased media, new font dependency or copied product design is used. `social-preview.png` is a browser-rendered export of the original SVG, not an application screenshot. Actual product captures are Playwright outputs under ignored `output/playwright/showcase/`.

No video content or storyboard was prepared, following the explicit section 11 instruction.

Hosted financial closure: the separately authorized Morgan USD 1 sandbox capture, duplicate-request check and one full refund are complete. Genuine signed approval/capture/refund callbacks matched the operation and provider readback; actual event resends left the REFUNDED ledger unchanged. Studio displayed USD 0.54 retained fees and −USD 0.54 net. The earlier transaction is unchanged. See [hosted verification](HOSTED_WEBHOOK_VERIFICATION.md) and the redacted lifecycle/redelivery evidence; no simulator or live payment is involved.

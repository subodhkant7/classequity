# ClassEquity visual design system

## Scope and ownership

Primary mode: cross-surface alignment. Marketing, guided exploration, login, school dashboard, parent portal and finance workflows share foundations while retaining different information densities. Public compositions live in `src/components/showcase/` and scoped `.public-site` CSS. Shared application primitives remain in `src/components/ui.tsx`; financial/domain/server logic stays separate.

## Foundations

| Role                       | Token / rule                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Brand / primary action     | `--forest: #173f35`                                                                                           |
| Canvas                     | `--canvas: #f8f7f0`                                                                                           |
| Botanical emphasis         | `--moss: #d6e5b5`                                                                                             |
| Secondary editorial accent | `--lavender: #e6e0ef`; warm clay used sparingly                                                               |
| Borders                    | `--outline: #d7ddce`; stronger input borders for control recognition                                          |
| Focus                      | `--focus: #79622b`; 3px visible outline and 4px offset on public controls                                     |
| Body type                  | Existing system sans-serif stack; no remote font download                                                     |
| Editorial headings         | Georgia/system serif, responsive 44–84px hero and 34–55px section headings                                    |
| Data type                  | Existing application sans serif; tabular monetary values; do not use decorative type for operational statuses |
| Shapes                     | 6–12px public control/panel radii; restrained borders/shadows; native application dialog retains 16px radius  |
| Spacing                    | 20/32/56px viewport gutters; 60/100px public section rhythm; tighter operational forms and tables             |
| Responsive                 | Public navigation changes at 760px; existing workspace drawer at 650px; 390px explicitly tested               |

Color is never the only status cue: operations carry text, support has lock/privacy language, and funding has exact amounts. Negative/unknown money is never softened into a success display. Body/focus/status foregrounds are selected for strong contrast on their intended surfaces; this is not a formal WCAG certification.

## Primitives and surface rules

PublicShell owns semantic navigation/footer/skip link; ActionLink owns public CTAs; SectionHeading owns editorial hierarchy. PricingLab, FundingLab and PaymentExplorer are product-local interactive explanations. They reuse domain functions rather than replacing the financial engine. They should not become operational financial controls.

Application Button/Badge/Notice/Field/Modal remain shared. Synchronous button actions retain focus; asynchronous actions expose busy state. Modal uses the native dialog primitive for focus containment, Escape and focus return. Parent tabs wait for their data rather than accepting an unhandled first action. Workspace navigation preserves role visibility and traps focus only while the mobile drawer is open.

Promote a new shared primitive only after more than one surface needs the same behavior. Do not add new literal colors to individual operational routes where an existing semantic token applies. Any token change needs desktop/mobile, focus, status legibility and reduced-motion checks. Dense grids may scroll within their own canvas; the page must not overflow.

## Motion

CSS only; no added motion dependency. Hero entrance and bus arrival are finite; chat replies have a brief reveal; pricing/funding/progress bars transition without moving page geometry. Scroll storytelling uses a small rise with content always visible, including full-page captures. No scroll hijacking, background animation loop or mandatory completion delay exists.

`prefers-reduced-motion` disables public animation/transitions and preserves all text. Tour “Skip animation” does the same locally. Replay remounts the current chapter’s local state; reset returns to chapter one and clears presentation state. Controls never depend on an animation completing.

## Accessibility and verification ownership

Primary remediation packet: keyboard/focus. Native buttons, links, ranges, labels, checkboxes and dialog are preferred. Tabs implement arrow navigation; chapter changes focus their heading; status text announces results. Responsive/reflow ownership remains with layout CSS, and report presentation with the real AG component.

Playwright exercises keyboard ranges, AI tabs, mobile navigation Escape/focus return, dialog Tab/Escape behavior, reduced motion, 390px reflow and accessible names. Automated semantic/keyboard checks do not establish full screen-reader quality; assistive-technology review remains a release follow-up. Governance stays in this document; individual component APIs and financial invariants remain with their owning modules.

Representative browser-measured contrast and finite motion/reduced-motion observations are recorded in `experience-verification.json`. Native dialog and drawer focus return, public chapter heading focus, arrow-key tabs and keyboard price thresholds all passed browser checks.

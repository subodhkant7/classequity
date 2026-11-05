# Three-minute demo

Start `npm run dev`, open http://localhost:3000, choose Explore the demo. Use fictional identities only. Screenshots are generated under ignored `output/playwright/` for local review.

**0:00–0:25 — Why it exists.** Landing: “Every child belongs on the trip. Every payment is accounted for.” School trips combine changing group prices, private financial need, and messy payment screenshots. ClassEquity makes the financial outcome explicit without naming support recipients.

**0:25–0:55 — School overview.** Enter as School admin. Oakwood Academy has 30 synthetic registrations and the $23 group tier. Open the activity and explain frozen consented pricing. Required seat funding is $690. Sponsor commitments are $115, but commitments are not money: only $70 sponsor money is captured in the synthetic scenario. Total net is $532.30; the gap remains $157.70 after fees.

**0:55–1:20 — Inclusion with a boundary.** Open registrations: no aid mapping is visible. Sign out and enter as Finance admin to see five approved synthetic allocations and individual payment operations. Mention finance is separately authorized at the application boundary, with shared operator password a documented sandbox limitation. Do not expose this screen to the ordinary teacher view.

**1:20–1:45 — Parent flow.** Enter as Parent. Review the fictional student's trip and My payments. Explain exact obligation, optional sponsor commitment, separate payment, and simulated receipt. For a fresh registration/consent story, create another open activity, issue a single-use invitation, redeem in a separate session and register a synthetic student. Only freeze after required consent and finance support decisions.

**1:45–2:15 — Real sponsor component.** Open Financial intelligence. Show actual AG Studio editable report, Group Unlock / Funding Assurance / Payment Integrity widgets and native grid/charts when verified. Ask the Gemini Agent Framework why the trip is pending; it sees only aggregates and can adjust analytical presentations. Reports save per authenticated school user. Do not claim an AI mutation succeeded unless the visible report changed.

**2:15–2:35 — Communication and document intelligence.** Open Communication, clearly identify WhatsApp SIMULATOR, ask the price and deadline in English/Hindi, then get a secure parent link. Show the quote-upload/review workflow with `public/sample-vendor-quote.svg` exported to PNG or another fictional USD quote. AI extraction is reviewed before activation; never upload hardship data.

**2:35–3:00 — The outcome.** In finance, run the fully funded simulation: it completes synthetic captures and records an audited synthetic school contribution for fees and refunded seat costs. Explain that real sandbox checkout has OAuth and order creation verified, requires human buyer approval, and captures/refunds/webhooks must be verified separately. End with exact shortfall-to-funded mechanics, not fabricated real-school impact.

## Sandbox handoff

1. Sandbox administrator signs in using the privately configured ADMIN_PASSWORD.
2. Issue an invitation; register a fictional student; approve any support in finance; freeze exact price.
3. Parent opens PayPal sandbox checkout. Human buyer approves using a personal sandbox account.
4. Return to the parent portal, finalize approved payment, read the receipt; finance reconciles.
5. Deploy public HTTPS before registering real PayPal/Twilio webhook URLs. Pair and opt in to WhatsApp before sending a permitted test.

The seed is non-destructive and does not reset demo mutations. Run funded/refund/payment demos thoughtfully. To get an untouched demo without deleting existing records, use a separate local PGlite path and seed it; never reset the shared Render database. `docs/integration-evidence.json` records actual provider credential/generation checks. Seed SIM-* capture IDs are never real PayPal transactions.

## Financial closure demonstration

Use the finance Funding assurance card to distinguish registered, parent-paid, fully assisted and covered seats. A zero-parent-obligation seat starts uncovered until captured sponsor money or an authorized treasury entry supplies its cost. The new School contributions form records source, positive USD amount and an authorization/receipt reference; demo entries remain synthetic. Reusing the same reference does not duplicate money. Never describe a treasury attestation as a PayPal capture.

Receipts with missing fee data say “Accounting pending.” Funding reserves the uncertain capture and cannot become ready. Finance supports partial refunds and refunding the remaining balance; duplicates reuse a stable identity and unresolved amounts remain reserved. Do not run these against sandbox money without the separately approved test plan.

The independent-worker command `npm run test:financial:concurrency` requires the dedicated PostgreSQL connection. It uses an isolated temporary schema and a loopback fake provider, including deliberate process kills. It makes no PayPal mutations. Evidence is redacted in `docs/financial-concurrency-evidence.json`.

See `FINANCIAL_WORKFLOW_CLOSURE.md` for current order availability, the private buyer handoff, exact verification classifications and hosted HTTPS blockers. Original order creation alone is not a captured payment demonstration.

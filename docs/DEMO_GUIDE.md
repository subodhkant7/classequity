# Explore ClassEquity locally

The same public experience is hosted at [https://classequity.onrender.com](https://classequity.onrender.com). Free hosting may take time to wake after idling. Hosting, sandbox webhook registration and genuine signed-event proof are separate gates; see [hosted verification](HOSTED_WEBHOOK_VERIFICATION.md). Public workspace payments/messages are simulations and cloud AI tools require restricted sandbox access. Never share the operator password or private buyer approval links in a presentation.

Run `npm run showcase`, then open `http://localhost:3100/` for the product introduction, `/how-it-works` for the pricing/funding labs, `/demo` for the complete guided tour and `/technology` for integration roles and verification boundaries. These public pages require no sign-in or provider credentials. Every tour change is local to the browser.

## Guided product exploration

1. **Plan an adventure.** Meet Oakwood Academy, our demo school, and the museum trip. Change the registration slider; see the applicable estimate and the next threshold.
2. **Understand the quotation.** Open the sample vendor quotation SVG, review the recorded Gemini extraction and try the local review checkbox. No activity or price is saved.
3. **Bring families together.** Consent to a $32 seat price ceiling, add a sample registration and unlock the $27 tier. Switch the illustrative conversation to Hindi. No name or invitation token is collected.
4. **Include privately.** Switch teacher/finance/sponsor explanations. No recipient mapping is disclosed and no access is granted. Change pledges, confirmed contributions and fees to see why five supported seats still cost $115.
5. **Verify every payment.** Step through the local state illustration, including unknown outcomes and a duplicate request. Separately read the recorded $1 sandbox proof: $1 captured, $1 refunded, $0.54 retained fee, −$0.54 net. This chapter sends no payment request.
6. **See the whole picture.** Use the actual AG Studio custom widgets, native funding chart and reconciliation grid with sample aggregates. Replay the labeled recorded AI view. The public report never calls Gemini or saved-state APIs. Its final link opens the real authenticated `/analytics` application.

Use chapter navigation, previous/next, Replay chapter, Skip animation or Reset demonstration at any time. `?chapter=adventure|quotation|families|support|payments|intelligence` opens a specific chapter. Reduced-motion preference preserves all information without decorative animation.

## Functional application

`/login` opens the separate operational product. Public **Interactive demo** role entry serves a read-only canonical Oakwood Academy reference dataset on the server (`$690.00` required, `$532.30` net, `$157.70` gap, `3` unresolved operations) so independent visitors cannot contaminate one another's view or exhaust shared quotas. Interactive pricing previews, local trips, funded scenarios, simulated payments/contributions/refunds, and Studio report changes stay strictly in the visitor's own browser tab (`sessionStorage`), with **Reset demo preview** / **Restore starter report** controls and automatic cleanup on sign-out. Direct server writes in `demo` mode return `HTTP 403 DEMO_READ_ONLY`. Restricted **Sandbox workspace** entry retains full persistent multi-actor server workflows; do not use the shared sandbox workflow for unapproved payment experiments. Financial capture/refund authorization from the previous phase is consumed and does not authorize another test.

For isolated application verification:

```sh
DATABASE_URL='' LOCAL_DATABASE_DIR='.data/experience-qa' APP_URL='http://localhost:3100' node --import tsx scripts/migrate.ts
DATABASE_URL='' LOCAL_DATABASE_DIR='.data/experience-qa' APP_URL='http://localhost:3100' node --import tsx scripts/seed.ts
DATABASE_URL='' LOCAL_DATABASE_DIR='.data/experience-qa' APP_URL='http://localhost:3100' GEMINI_API_KEY='' CE_PREVIEW_ISOLATED=true npm run dev -- --webpack --port 3100
```

Then run the browser suite in another terminal with the same DATABASE_URL/LOCAL_DATABASE_DIR/APP_URL settings and `E2E_BASE_URL=http://localhost:3100 npm run test:e2e`. Captures are under ignored `output/playwright/showcase/`. Seeding does not reset existing records. No shared database migration or provider test is necessary to view the public pages.

No video storyboard, script, recording or timing plan was prepared in this phase, following the user’s explicit instruction.

The one-command `showcase` launcher creates only an isolated local `.data/experience-preview` database, supplies temporary local-only session/operator secrets, disables provider credentials in its child process and listens on loopback port 3100. It never changes `.env` or the shared database. Demo-role entry works in this isolated workspace; real sandbox operator entry is intentionally unavailable there. Stop it with Ctrl+C.

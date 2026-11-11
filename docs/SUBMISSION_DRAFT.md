# ClassEquity submission package

- **Project name** ClassEquity
- **Tagline** Every child belongs on the trip. Every payment is accounted for.
- **Working demo** [classequity.onrender.com](https://classequity.onrender.com)
- **Public source URL** `[ADD PUBLIC REPOSITORY URL AFTER APPROVAL]`
- **YouTube URL** `[ADD FINAL PUBLIC YOUTUBE URL]`

## Overview

ClassEquity gives school staff and families one place to plan activities, coordinate group discounts and see verified funding. A school can offer private assistance while finance keeps track of captures, fees, refunds and unresolved outcomes. Gemini helps staff and families work with approved information.

## Problem

Trip prices depend on participation. Spreadsheets, chat threads, hardship requests and payment screenshots make it hard to know what a family agreed to pay, who can privately receive help and whether the trip is actually funded.

## How it works

1. School staff upload a quotation. Gemini extracts price tiers and terms into a reviewable draft. An authorized staff member reviews the draft and activates the pricing.
2. The school invites families through scoped links. Families see an estimate and consent to a ceiling. The school freezes an exact obligation within that consent.
3. Finance reviews assistance privately. Sponsors see permitted aggregate needs. Funding calculations use captured amounts, known fees and refunds. Open commitments and uncertain outcomes are visible separately.
4. PayPal Sandbox handles buyer approval and settlement. Signed webhooks trigger independent provider readback and durable reconciliation. Staff see the ledger in native reports.

## PayPal and AI

The hosted one-dollar sandbox exercise completed one capture and one full refund. Genuine signed approval, capture and refund callbacks arrived on the public HTTPS receiver. Independent readbacks confirmed the result, including $0.54 in retained fees. Duplicate requests and actual redelivery left the ledger unchanged. [Redacted verification](HOSTED_WEBHOOK_VERIFICATION.md)

Gemini extracts sample vendor quotations, answers approved trip questions in English or Hindi, and helps an authenticated AG Studio agent explain financial aggregates. Humans approve pricing, consent, assistance and payment actions. Integer-cent code computes the authoritative figures. The deployed assistant generated verified English and Hindi answers through the restricted sandbox workspace. Local tests verified PDF extraction and a rendered, editable agent-created report. The hosted PDF attempt returned HTTP 502 and hosted agent generation was untested. The public tour labels its recorded and illustrative examples. [Hosted Gemini verification](HOSTED_GEMINI_VERIFICATION.md) · [Local provider verification](PROVIDER_LIVE_VERIFICATION.md)

## Tools and innovation

AG Studio and AG Grid render editable reports and native reconciliation charts and grids. ClassEquity adds Group Unlock, Funding Assurance and Payment Integrity widgets. APIMatic context guided the PayPal and Twilio integrations, and the official PayPal server SDK is APIMatic-generated. Render hosts the HTTPS application and PostgreSQL. The WhatsApp adapter covers pairing, English/Hindi replies and secure links. Twilio confirmed one Sandbox delivery through the ClassEquity adapter. Hosted inbound and status callbacks remain unverified.

ClassEquity combines consent-bounded group pricing with confidential assistance and net funding. A lower tier can help families afford a trip. Finance can account for fees and refunds before marking seats covered, while other roles see only their permitted views.

## Challenges and lessons

Concurrency required durable capture claims, refund balance reservations and version checks on independent readback. The team made missing fee data a distinct state after finding that a completed provider capture can lack accounting details. Replaying genuine signed events tested whether duplicates preserve a refunded ledger. Aggregation lets staff explain the budget in Studio without exposing family assistance mappings to teachers or the model.

## Testing instructions for judges

Open `/demo` for the credential-free tour. Open `/login` and use the School admin, Parent and Finance admin demo accounts to work with persisted sample data and editable analytics. Allow the Render web service time to wake after inactivity. The PostgreSQL database is on a paid plan. Use the README's `npm ci` and `npm run showcase` path if the hosted service is unavailable. The local preview creates its own isolated sample database and runs without provider credentials. [Judge access and continuity](HACKATHON_READINESS.md) · [Setup](../README.md)

## Limitations

The project uses sample school data and PayPal Sandbox. The restricted sandbox operator uses a shared password. Render hosts the application and a paid PostgreSQL database. The local showcase is the independently tested judging fallback. AG Studio has a vendor evaluation arrangement for judging and commercial terms for broader deployment. [Third-party notices](../THIRD_PARTY_NOTICES.md)

## Final owner-controlled submission steps

1. Complete the [publication checklist](PUBLICATION_CHECKLIST.md), including a fresh all-ref secret/history scan and licensing verification, before changing repository visibility.
2. After explicit approval, publish the repository and replace the public-source URL placeholder above with the verified public link.
3. Upload the approved under-three-minute ClassEquity MP4 to YouTube as **Public**, verify playback in a signed-out browser, and replace the video URL placeholder above. Do not commit the large MP4 or raw recording artifacts.
4. Attach only reviewed, non-sensitive screenshots. Confirm every provider and AI claim reflects the separately verified evidence boundaries before manual Devpost submission.

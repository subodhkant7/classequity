# Twilio WhatsApp integration

`src/server/integrations/twilio.ts` uses the official typed Twilio Node SDK 6.2.0; `src/server/messaging.ts` is the application service shared by real and simulated conversations. APIMatic's 0.4.1 Context Plugin, generated messaging resource map and auth/error guidance informed the integration. The published official Twilio SDK supplies TwiML and the maintained request-signature validator, which the inspected generic APIMatic REST package does not supply.

Inbound: POST `/api/webhooks/twilio`, form URL encoded. The server validates `X-Twilio-Signature` over the exact configured external APP_URL and all received form fields, checks AccountSid, and deduplicates MessageSid durably. Successful replies are cached by message identity. Sensitive state is never changed through conversational intents. Registration/payment/status intents issue bounded single-use browser invitations only for paired families; details/pricing/deadlines use approved school facts and Gemini with a local fallback. English and Hindi are supported. Unknown senders receive pairing/invitation guidance only.

Pairing: a parent enters a phone number in an authenticated browser session, obtains `LINK <random conversation ID>`, joins the Twilio sandbox, then sends the code from the registered WhatsApp number. Only an exact code from the expected sender records opt-in. A mere arbitrary phone message cannot authorize payments, assistance or consent. Do not send hardship documents here.

Outbound reminders require verified opt-in and inbound activity within the 24-hour customer-service window. Outside it, this app refuses free-form sends; configure an approved template in a later pass. Sandbox participants must join the sandbox and remain eligible under Twilio's sandbox restrictions. No bulk or unsolicited messages are implemented.

Status callbacks: POST `/api/webhooks/twilio/status`, same signature/account validation, update by provider MessageSid. SDK retries are disabled for sends. The message row is persisted before sending; ambiguous delivery is `unknown`, requiring provider investigation before resending. Initial UI masks phone numbers and shows pairing state. It does not yet provide a complete delivery-status timeline.

Demo: `/messages` labels every exchange SIMULATOR and uses only the demo tenant. Its replies call the same conversation service with synthetic messages. `Simulate reminder` never calls Twilio. It cannot be mistaken for a verified provider delivery.

Evidence: account read returned HTTP 200. No outbound message was sent, and no public inbound/status webhook has been registered or delivered. Remaining setup: deploy HTTPS, set APP_URL exactly, set sandbox inbound URL to `/api/webhooks/twilio` (POST), enable status callback URL, join with a human phone, pair, send permitted messages, verify delivery and replay behavior end to end. Tests validate authentic signature, altered body rejection, missing signature, and URL mismatch.

Sources: https://www.twilio.com/docs/whatsapp/sandbox ; https://www.twilio.com/docs/usage/webhooks/webhooks-security ; APIMatic map https://github.com/context-plugins/twilio-typescript-sdk/blob/main/map/operations/api20100401-message.md .

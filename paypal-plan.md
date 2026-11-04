# PayPal implementation contract

Scope: TypeScript strict, Node runtime, single first-party merchant, USD sandbox only.
This is the local contract sheet for the integration. The installed Context Plugin's `paypal` Git-source package differs from the production npm SDK used here. We read the plugin's SDK map and orders/payments pages and verify implementation signatures against `@paypal/paypal-server-sdk` 2.5.0 source. No claim of using the unpublished `paypal` package.

| Operation            | Wire / contract                                                                                                                        | Implementation                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| OAuth                | POST /v1/oauth2/token, Basic client credentials, form grant_type=client_credentials, access_token/expires_in                           | APIMatic-generated SDK credential manager; cached narrow REST adapter for webhook verification |
| Create               | POST /v2/checkout/orders, body OrderRequest, CAPTURE, purchase_units exact USD amount and custom_id, PayPal-Request-Id                 | OrdersController.createOrder({body,paypalRequestId,prefer})                                    |
| Read order           | GET /v2/checkout/orders/{id}, merchant OAuth, persisted order ownership                                                                | OrdersController.getOrder({id})                                                                |
| Capture              | POST /v2/checkout/orders/{id}/capture, PayPal-Request-Id stable operation key + suffix                                                 | OrdersController.captureOrder({id,paypalRequestId,prefer})                                     |
| Read capture         | GET /v2/payments/captures/{capture_id}, status, exact money, seller fee, related order                                                 | PaymentsController.getCapturedPayment({captureId})                                             |
| Refund full          | POST /v2/payments/captures/{capture_id}/refund, empty body, stable PayPal-Request-Id                                                   | PaymentsController.refundCapturedPayment({captureId,body:{},paypalRequestId,prefer})           |
| Read refund          | GET /v2/payments/refunds/{refund_id}, count only COMPLETED                                                                             | PaymentsController.getRefund({refundId})                                                       |
| Webhook verification | POST /v1/notifications/verify-webhook-signature with all five transmission headers, registered webhook_id, full event; require SUCCESS | Narrow REST extension: absent in generated Orders/Payments controllers                         |

Environment is explicitly Environment.Sandbox; live operation configuration rejected. SDK HTTP retries disabled; application uses stable persisted logical keys and provider readback. Prefer return=representation because IDs and capture breakdown are needed. No merchant assertion or partner attribution is invented. Browser prices are never accepted.

Durable writes: unique ce_payment_operations.obligation_id claims one logical operation before create; CAS status claims create/capture; unique ce_refund_operations.capture_id claims full refund. Unknown create retries only same stored key within bounded window. Unknown capture readback happens in catch and on finance reconciliation. Unknown refund cannot create a second refund; finance must reconcile/provider investigate when no refund ID returned.

Cross-operation invariants: actor tenant must own trip; parent must own immutable obligation; exact currency and amount and purchase custom_id match before capture; capture related order checked when supplied. First-party merchant OAuth supplies merchant ownership. No hardship or beneficiary mapping is sent.

Provider errors: caller 4xx retained as appropriate, 401/403 become integration error, 429 becomes service unavailable, 5xx/transport/decode on writes become UNKNOWN; raw SDK error text not returned. Optional request fields are limited to obligation reference/custom ID, exact amount, stable request ID, return/cancel URLs for browser checkout, and representation preference.

Sources: installed paypal Context Plugin 0.4.1; map API spec 2.29, package 2.29.0 (context-plugins/paypal-typescript-sdk); installed @paypal/paypal-server-sdk/src/controllers and models (APIMATIC v3 generated); PayPal official Orders v2/Payments v2 and webhook docs. See docs/APIMATIC_INTEGRATION.md for limitations and test evidence.

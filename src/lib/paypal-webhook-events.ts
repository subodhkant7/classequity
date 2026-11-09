// Payments v2 uses DECLINED; DENIED remains a supported Payments v1 notification.
// Confirm subscriptions against the configured app's event-types API before registration.
export const paypalWebhookEvents = [
  'CHECKOUT.ORDER.APPROVED',
  'PAYMENT.CAPTURE.COMPLETED',
  'PAYMENT.CAPTURE.PENDING',
  'PAYMENT.CAPTURE.DECLINED',
  'PAYMENT.CAPTURE.DENIED',
  'PAYMENT.CAPTURE.REFUNDED',
  'PAYMENT.CAPTURE.REVERSED',
  'PAYMENT.REFUND.PENDING',
  'PAYMENT.REFUND.FAILED',
] as const;

export function paypalEventKind(type: string) {
  if ((paypalWebhookEvents as readonly string[]).includes(type)) return 'supported';
  return /^(PAYMENT\.(CAPTURE|REFUND)\.|CHECKOUT\.ORDER\.)/.test(type)
    ? 'unsupported-financial'
    : 'unrelated';
}

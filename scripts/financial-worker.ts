// Test-only child process. It never connects to PayPal.
import type { Order, CapturedPayment, Refund } from '@paypal/paypal-server-sdk';
if (
  process.env.NODE_ENV !== 'test' ||
  !process.env.CE_TEST_SCHEMA?.startsWith('ce_verify_') ||
  !process.env.FINANCIAL_FAKE_URL?.startsWith('http://127.0.0.1:')
)
  throw Error('Isolated verification environment required');
const { paypal, ProviderFailure } = await import('../src/server/integrations/paypal');
async function fake<T>(path: string, body?: unknown): Promise<T> {
  try {
    const r = await fetch(
      `${process.env.FINANCIAL_FAKE_URL}${path}`,
      body
        ? {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          }
        : {},
    );
    if (!r.ok) throw Error('fake provider rejected');
    return await r.json();
  } catch {
    throw new ProviderFailure(true, 'INJECTED_NETWORK_FAILURE');
  }
}
paypal.order = (id) => fake<Order>(`/order/${id}`);
paypal.captureRead = (id) => fake<CapturedPayment>(`/capture/${id}`);
paypal.refundRead = (id) => fake<Refund>(`/refund/${id}`);
paypal.capture = (id, key) => fake<Order>(`/capture/${id}`, { key });
paypal.refund = (id, key, cents, claimId) => fake<Refund>(`/refund/${id}`, { key, cents, claimId });
paypal.create = async () => {
  throw Error('Order creation prohibited in concurrency harness');
};
const { capturePayment, settleOperation, refundPayment } = await import('../src/server/payments');
const { closeDatabase } = await import('../src/db');
process.on(
  'message',
  async (m: {
    id: number;
    action: string;
    operationId: string;
    captureId?: string;
    cents?: number;
    clientKey?: string;
  }) => {
    try {
      if (m.action === 'close') {
        await closeDatabase();
        process.exit(0);
      }
      const actor = {
        schoolId: 'verify-school',
        userId: 'verify-finance',
        name: 'Fictional verifier',
        role: 'finance',
        mode: 'sandbox',
      } as const;
      const result =
        m.action === 'capture'
          ? await capturePayment(actor, m.operationId)
          : m.action === 'refund'
            ? await refundPayment(actor, m.captureId!, m.cents, m.clientKey)
            : await settleOperation(m.operationId);
      process.send?.({ id: m.id, result });
    } catch (e) {
      process.send?.({
        id: m.id,
        error: true,
        code: typeof e === 'object' && e && 'code' in e ? e.code : 'ERROR',
        status: typeof e === 'object' && e && 'status' in e ? e.status : 500,
      });
    }
  },
);
process.send?.({ ready: true, pid: process.pid });

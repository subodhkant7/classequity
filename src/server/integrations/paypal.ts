import {
  Client,
  Environment,
  OrdersController,
  PaymentsController,
  CheckoutPaymentIntent,
  ApiError,
  type Order,
  type CapturedPayment,
  type Refund,
} from '@paypal/paypal-server-sdk';
import { z } from 'zod';
import { decimal } from '@/lib/domain';
import { AppError } from '../errors';
const HOST = 'https://api-m.sandbox.paypal.com';
let client: Client | undefined;
function getClient() {
  if (process.env.PAYPAL_ENV !== 'sandbox')
    throw new AppError('Only PayPal sandbox is enabled.', 503);
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)
    throw new AppError('PayPal sandbox credentials are missing.', 503);
  return (client ??= new Client({
    environment: Environment.Sandbox,
    timeout: 20000,
    clientCredentialsAuthCredentials: {
      oAuthClientId: process.env.PAYPAL_CLIENT_ID,
      oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET,
    },
    httpClientOptions: { retryConfig: { maxNumberOfRetries: 0 } },
  }));
}
export class ProviderFailure extends AppError {
  constructor(
    public ambiguous: boolean,
    public providerCode: string,
    status = 502,
  ) {
    super(
      ambiguous
        ? 'Payment outcome is unknown. Reconcile this operation before retrying.'
        : `PayPal could not complete this request (${providerCode}).`,
      status,
      providerCode,
    );
  }
}
function translate(e: unknown): never {
  if (e instanceof AppError) throw e;
  if (e instanceof ApiError) {
    const body = typeof e.body === 'string' ? e.body : '';
    let code = 'PROVIDER_REJECTED';
    try {
      const b = JSON.parse(body);
      code = String(b.details?.[0]?.issue ?? b.name ?? code)
        .replace(/[^A-Z0-9_]/g, '')
        .slice(0, 80);
    } catch {}
    throw new ProviderFailure(
      e.statusCode >= 500,
      code,
      e.statusCode === 429
        ? 503
        : e.statusCode >= 400 && e.statusCode < 500 && ![401, 403].includes(e.statusCode)
          ? e.statusCode
          : 502,
    );
  }
  throw new ProviderFailure(true, 'TRANSPORT_OR_DECODE');
}
export const paypal = {
  async create(cents: number, obligationId: string, key: string) {
    try {
      const orders = new OrdersController(getClient());
      const url = process.env.APP_URL || 'http://localhost:3000';
      const { result } = await orders.createOrder({
        paypalRequestId: key,
        prefer: 'return=representation',
        body: {
          intent: CheckoutPaymentIntent.Capture,
          purchaseUnits: [
            {
              referenceId: obligationId,
              customId: obligationId,
              amount: { currencyCode: 'USD', value: decimal(cents) },
            },
          ],
          paymentSource: {
            paypal: {
              experienceContext: {
                returnUrl: `${url}/parent?checkout=approved`,
                cancelUrl: `${url}/parent?checkout=cancelled`,
              },
            },
          },
        },
      });
      if (!result.id) throw new ProviderFailure(true, 'MISSING_ORDER_ID');
      return result;
    } catch (e) {
      translate(e);
    }
  },
  async order(id: string): Promise<Order> {
    try {
      return (await new OrdersController(getClient()).getOrder({ id })).result;
    } catch (e) {
      translate(e);
    }
  },
  async capture(id: string, key: string): Promise<Order> {
    try {
      return (
        await new OrdersController(getClient()).captureOrder({
          id,
          paypalRequestId: key,
          prefer: 'return=representation',
        })
      ).result;
    } catch (e) {
      translate(e);
    }
  },
  async captureRead(id: string): Promise<CapturedPayment> {
    try {
      return (await new PaymentsController(getClient()).getCapturedPayment({ captureId: id }))
        .result;
    } catch (e) {
      translate(e);
    }
  },
  async refund(id: string, key: string): Promise<Refund> {
    try {
      return (
        await new PaymentsController(getClient()).refundCapturedPayment({
          captureId: id,
          paypalRequestId: key,
          prefer: 'return=representation',
          body: {},
        })
      ).result;
    } catch (e) {
      translate(e);
    }
  },
  async refundRead(id: string): Promise<Refund> {
    try {
      return (await new PaymentsController(getClient()).getRefund({ refundId: id })).result;
    } catch (e) {
      translate(e);
    }
  },
};
let tokenCache: { value: string; until: number } | undefined;
let tokenPromise: Promise<string> | undefined;
export async function accessToken() {
  if (tokenCache && tokenCache.until > Date.now()) return tokenCache.value;
  if (tokenPromise) return tokenPromise;
  tokenPromise = (async () => {
    if (
      process.env.PAYPAL_ENV !== 'sandbox' ||
      !process.env.PAYPAL_CLIENT_ID ||
      !process.env.PAYPAL_CLIENT_SECRET
    )
      throw new AppError('PayPal sandbox is not configured', 503);
    const r = await fetch(`${HOST}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new AppError('PayPal authentication unavailable', 502);
    const t = z.object({ access_token: z.string(), expires_in: z.number() }).parse(await r.json());
    tokenCache = {
      value: t.access_token,
      until: Date.now() + Math.max(0, t.expires_in - 90) * 1000,
    };
    return t.access_token;
  })();
  try {
    return await tokenPromise;
  } finally {
    tokenPromise = undefined;
  }
}
export async function verifyPaypalWebhook(headers: Headers, event: unknown) {
  if (!process.env.PAYPAL_WEBHOOK_ID) return false;
  const transmissionTime = headers.get('paypal-transmission-time');
  if (!transmissionTime || Math.abs(Date.now() - Date.parse(transmissionTime)) > 3 * 86400000)
    return false;
  const fields = [
    'paypal-auth-algo',
    'paypal-cert-url',
    'paypal-transmission-id',
    'paypal-transmission-sig',
  ];
  if (fields.some((k) => !headers.get(k))) return false;
  const r = await fetch(`${HOST}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: transmissionTime,
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: event,
    }),
    signal: AbortSignal.timeout(15000),
  });
  return r.ok && (await r.json()).verification_status === 'SUCCESS';
}

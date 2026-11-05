import { createHash } from 'node:crypto';
import { and, eq, or, isNull, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import * as s from '@/db/schema';
import { AppError } from './errors';
import { verifyPaypalWebhook } from './integrations/paypal';
import { settleOperation } from './payments';
import { uid } from './services';
export async function boundedWebhookBody(req: Request) {
  const maximum = 250000;
  const declared = req.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maximum))
    throw new AppError('Payload too large', 413);
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new AppError('JSON required', 415);
  const reader = req.body?.getReader();
  if (!reader) throw new AppError('Empty webhook', 400);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximum) {
        await reader.cancel();
        throw new AppError('Payload too large', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export async function paypalWebhook(req: Request) {
  const raw = await boundedWebhookBody(req);
  let original: unknown;
  try {
    original = JSON.parse(raw);
  } catch {
    throw new AppError('Malformed webhook JSON', 400);
  }
  // Never pass a Zod projection to verification. Every original event field is retained.
  if (!(await verifyPaypalWebhook(req.headers, original)))
    throw new AppError('Webhook signature rejected', 401);
  const event = z
    .object({
      id: z.string().min(1).max(150),
      event_type: z.string().min(1).max(150),
      resource: z.record(z.string(), z.unknown()),
    })
    .parse(original);
  const bodyHash = createHash('sha256').update(canonical(original)).digest('hex');
  const token = uid();
  await db
    .insert(s.inbox)
    .values({ id: uid(), provider: 'paypal', eventId: event.id, status: 'RETRYABLE', bodyHash })
    .onConflictDoNothing({ target: [s.inbox.provider, s.inbox.eventId] });
  const [previous] = await db
    .select()
    .from(s.inbox)
    .where(and(eq(s.inbox.provider, 'paypal'), eq(s.inbox.eventId, event.id)));
  if (previous.bodyHash !== bodyHash) throw new AppError('Webhook event identity collision', 409);
  if (['PROCESSED', 'IGNORED'].includes(previous.status))
    return { received: true, duplicate: true };
  const [claim] = await db
    .update(s.inbox)
    .set({
      status: 'PROCESSING',
      leaseToken: token,
      leaseUntil: sql`now()+interval '2 minutes'`,
      attempts: sql`${s.inbox.attempts}+1`,
      errorCode: null,
    })
    .where(
      and(
        eq(s.inbox.id, previous.id),
        or(isNull(s.inbox.leaseUntil), lte(s.inbox.leaseUntil, sql`now()`)),
      ),
    )
    .returning();
  if (!claim) throw new AppError('Event processing in progress; retry delivery.', 503);
  try {
    const financial = /^(PAYMENT\.(CAPTURE|REFUND)\.|CHECKOUT\.ORDER\.)/.test(event.event_type);
    if (!financial) {
      await finish('IGNORED');
      return { received: true, ignored: true };
    }
    const related = z
      .object({
        related_ids: z
          .object({ order_id: z.string().optional(), capture_id: z.string().optional() })
          .optional(),
      })
      .safeParse(event.resource.supplementary_data);
    const ids = related.success ? related.data.related_ids : undefined;
    const resourceId = typeof event.resource.id === 'string' ? event.resource.id : undefined;
    const orderId =
      ids?.order_id || (event.event_type.startsWith('CHECKOUT.ORDER.') ? resourceId : undefined);
    let [op] = orderId
      ? await db.select().from(s.operations).where(eq(s.operations.orderId, orderId))
      : [];
    if (!op) {
      const [cap] =
        ids?.capture_id || resourceId
          ? await db
              .select()
              .from(s.captures)
              .where(eq(s.captures.providerId, ids?.capture_id || resourceId!))
          : [];
      if (cap)
        [op] = await db.select().from(s.operations).where(eq(s.operations.id, cap.operationId));
    }
    if (!op && resourceId) {
      const custom =
        typeof event.resource.custom_id === 'string' ? event.resource.custom_id : undefined;
      const [refund] = await db
        .select()
        .from(s.refunds)
        .where(
          custom
            ? or(eq(s.refunds.providerId, resourceId), eq(s.refunds.id, custom))
            : eq(s.refunds.providerId, resourceId),
        );
      if (refund) {
        const [cap] = await db.select().from(s.captures).where(eq(s.captures.id, refund.captureId));
        if (cap)
          [op] = await db.select().from(s.operations).where(eq(s.operations.id, cap.operationId));
      }
    }
    if (!op || op.mode !== 'sandbox')
      throw new AppError(
        'No sandbox operation matched; retain notification for retry.',
        503,
        'UNMATCHED_EVENT',
      );
    await settleOperation(
      op.id,
      event.event_type === 'PAYMENT.CAPTURE.REFUNDED' ||
        event.event_type.startsWith('PAYMENT.REFUND.')
        ? resourceId
        : undefined,
    );
    await finish('PROCESSED');
    return { received: true };
  } catch (e) {
    await db
      .update(s.inbox)
      .set({
        status: 'RETRYABLE',
        leaseToken: null,
        leaseUntil: null,
        errorCode: e instanceof AppError ? e.code : 'RECONCILIATION_FAILED',
      })
      .where(and(eq(s.inbox.id, claim.id), eq(s.inbox.leaseToken, token)));
    throw e;
  }
  async function finish(status: string) {
    const saved = await db
      .update(s.inbox)
      .set({ status, leaseToken: null, leaseUntil: null })
      .where(and(eq(s.inbox.id, claim.id), eq(s.inbox.leaseToken, token)))
      .returning();
    if (!saved.length) throw new AppError('Webhook lease expired; retry.', 503);
  }
}

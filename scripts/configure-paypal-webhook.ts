import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { z } from 'zod';
import { accessToken } from '../src/server/integrations/paypal';
import { paypalWebhookEvents } from '../src/lib/paypal-webhook-events';

const host = 'https://api-m.sandbox.paypal.com';
const fingerprint = (value: string) => createHash('sha256').update(value).digest('hex');
const hookSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  event_types: z.array(z.object({ name: z.string() })),
});
async function request(path: string, method = 'GET', body?: unknown) {
  const r = await fetch(`${host}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw Error(`Sandbox webhook management returned HTTP ${r.status}`);
  return r.json();
}
async function main() {
  if (process.env.PAYPAL_ENV !== 'sandbox') throw Error('Sandbox required.');
  const action = process.argv[2] || 'inspect';
  if (!['inspect', 'register', 'events'].includes(action))
    throw Error('Use inspect, register or events.');
  if (action === 'events') {
    const result = z
      .object({
        events: z
          .array(
            z.object({
              id: z.string(),
              event_type: z.string(),
              create_time: z.string().optional(),
            }),
          )
          .default([]),
      })
      .parse(await request('/v1/notifications/webhooks-events?page_size=100'));
    // Never retain resource bodies or financial identities in an event listing.
    console.log({
      sandbox: true,
      eventCount: result.events.length,
      events: result.events.map((e) => ({
        fingerprint: fingerprint(e.id),
        type: e.event_type,
        createdAt: e.create_time,
      })),
    });
    return;
  }
  const hooks = z
    .object({ webhooks: z.array(hookSchema).default([]) })
    .parse(await request('/v1/notifications/webhooks'));
  console.log({
    sandboxAppFingerprint: fingerprint(process.env.PAYPAL_CLIENT_ID || ''),
    registrations: hooks.webhooks.map((h) => ({
      url: h.url,
      eventTypes: h.event_types.map((e) => e.name),
    })),
  });
  if (action === 'inspect') return;
  const origin = new URL(process.env.APP_URL || '');
  if (
    origin.protocol !== 'https:' ||
    origin.origin !== process.env.APP_URL ||
    !origin.hostname.endsWith('.onrender.com')
  )
    throw Error('Use the exact verified Render HTTPS origin.');
  const health = await fetch(`${origin.origin}/api/health`, { signal: AbortSignal.timeout(20000) });
  const expected =
    process.env.EXPECTED_DEPLOYED_COMMIT ||
    execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (!/^[a-f0-9]{40}$/.test(expected))
    throw Error('An exact expected deployed commit is required.');
  const ready = await health.json();
  if (
    !health.ok ||
    ready.status !== 'ok' ||
    ready.database !== 'ready' ||
    ready.commit !== expected
  )
    throw Error('The exact local candidate must first pass hosted readiness.');
  const available = z
    .object({ event_types: z.array(z.object({ name: z.string() })) })
    .parse(await request('/v1/notifications/webhooks-event-types'));
  const eventTypes = paypalWebhookEvents
    .filter((name) => available.event_types.some((e) => e.name === name))
    .map((name) => ({ name }));
  for (const critical of [
    'CHECKOUT.ORDER.APPROVED',
    'PAYMENT.CAPTURE.COMPLETED',
    'PAYMENT.CAPTURE.PENDING',
    'PAYMENT.CAPTURE.DECLINED',
    'PAYMENT.CAPTURE.REFUNDED',
    'PAYMENT.CAPTURE.REVERSED',
  ])
    if (!eventTypes.some((e) => e.name === critical))
      throw Error('A required sandbox event type is unavailable.');
  const url = `${origin.origin}/api/webhooks/paypal`;
  const matches = hooks.webhooks.filter((h) => h.url === url);
  if (matches.length > 1) throw Error('Duplicate existing registrations require review.');
  let hook = matches[0];
  let change = 'reused';
  if (!hook) {
    hook = hookSchema.parse(
      await request('/v1/notifications/webhooks', 'POST', { url, event_types: eventTypes }),
    );
    change = 'created';
  } else if (
    JSON.stringify(hook.event_types.map((e) => e.name).sort()) !==
    JSON.stringify(eventTypes.map((e) => e.name).sort())
  ) {
    hook = hookSchema.parse(
      await request(`/v1/notifications/webhooks/${encodeURIComponent(hook.id)}`, 'PATCH', [
        { op: 'replace', path: '/event_types', value: eventTypes },
      ]),
    );
    change = 'updated';
  }
  const readback = hookSchema.parse(
    await request(`/v1/notifications/webhooks/${encodeURIComponent(hook.id)}`),
  );
  if (
    readback.url !== url ||
    !eventTypes.every((e) => readback.event_types.some((r) => r.name === e.name))
  )
    throw Error('Webhook registration readback mismatch.');
  await mkdir('.data/hosted', { recursive: true, mode: 0o700 });
  await writeFile('.data/hosted/paypal-webhook.json', JSON.stringify(readback), { mode: 0o600 });
  const env = JSON.parse(await readFile('.data/hosted/render-env.json', 'utf8'));
  env.PAYPAL_WEBHOOK_ID = readback.id;
  await writeFile('.data/hosted/render-env.json', JSON.stringify(env), { mode: 0o600 });
  console.log({
    registered: true,
    change,
    url,
    webhookFingerprint: fingerprint(readback.id),
    eventTypes: readback.event_types.map((e) => e.name),
    signatureVerified: false,
    deliveryVerified: false,
    captureOrRefundPerformed: false,
  });
}
main().catch((e) => {
  console.error(
    e instanceof Error && !/secret|token|password/i.test(e.message)
      ? e.message
      : 'Sandbox webhook configuration failed; inspect privately.',
  );
  process.exitCode = 1;
});

// Explicitly bounded fictional order preparation only. No capture or refund API exists here.
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { and, eq } from 'drizzle-orm';
import { db, closeDatabase } from '../src/db';
import * as s from '../src/db/schema';
import { createTrip, register, freeze } from '../src/server/services';
import { paymentOrder } from '../src/server/payments';
import type { Actor } from '../src/server/auth';

async function main() {
  if (
    process.env.PAYPAL_ENV !== 'sandbox' ||
    process.env.APP_URL !== 'https://classequity.onrender.com'
  )
    throw Error('Verified hosted sandbox origin required.');
  const ready = await fetch(`${process.env.APP_URL}/api/health`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!ready.ok || (await ready.json()).database !== 'ready')
    throw Error('Hosted readiness required.');
  const admin: Actor = {
    userId: 'sandbox-admin',
    schoolId: 'sandbox-school',
    name: 'Sandbox administrator',
    role: 'admin',
    mode: 'sandbox',
  };
  const userId = 'sandbox-hosted-webhook-family';
  const parent: Actor = { ...admin, userId, name: 'Morgan Sandbox Webhook Family', role: 'parent' };
  await db.transaction(async (tx) => {
    await tx
      .insert(s.users)
      .values({ id: userId, name: parent.name, email: 'hosted-webhook-family@example.test' })
      .onConflictDoNothing();
    await tx
      .insert(s.memberships)
      .values({ id: userId, schoolId: admin.schoolId, userId, role: 'parent' })
      .onConflictDoNothing();
  });
  const name = 'Hosted webhook verification';
  const existing = await db
    .select()
    .from(s.trips)
    .where(and(eq(s.trips.schoolId, admin.schoolId), eq(s.trips.name, name)));
  if (existing.length > 1) throw Error('Duplicate preparation requires review.');
  const tripId =
    existing[0]?.id ||
    (await createTrip(admin, {
      name,
      destination: 'Fictional sandbox workshop',
      description:
        'CE-WEBHOOK-20261107: one fictional USD 1 seat to verify genuine hosted sandbox notifications. No real school activity.',
      date: '2026-12-01',
      deadline: '2026-11-30',
      capacity: 1,
      tiers: [{ min: 1, cents: 100 }],
    }));
  let [registration] = await db
    .select()
    .from(s.registrations)
    .where(eq(s.registrations.tripId, tripId));
  if (!registration) {
    await register(parent, tripId, {
      student: 'Morgan Sandbox Webhook Example',
      consent: true,
      ceilingCents: 100,
    });
    [registration] = await db
      .select()
      .from(s.registrations)
      .where(eq(s.registrations.tripId, tripId));
  }
  if (registration.parentId !== userId) throw Error('Unexpected prepared family.');
  const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, tripId));
  if (
    trip.capacity !== 1 ||
    trip.tiers.length !== 1 ||
    trip.tiers[0].min !== 1 ||
    trip.tiers[0].cents !== 100 ||
    !trip.description.startsWith('CE-WEBHOOK-20261107:')
  )
    throw Error('Unexpected obligation policy.');
  if (trip.state === 'OPEN') await freeze(admin, tripId);
  const [obligation] = await db
    .select()
    .from(s.obligations)
    .where(eq(s.obligations.registrationId, registration.id));
  if (!obligation || obligation.cents !== 100 || obligation.kind !== 'SEAT')
    throw Error('Exactly one USD 1 seat is required.');
  const [prior] = await db
    .select()
    .from(s.operations)
    .where(eq(s.operations.obligationId, obligation.id));
  if (prior?.captureRequestedAt)
    throw Error(
      'This scenario has already claimed capture; do not replace or reuse authorization.',
    );
  const order = await paymentOrder(parent, obligation.id);
  await mkdir('.data/hosted', { recursive: true, mode: 0o700 });
  await writeFile(
    '.data/hosted/checkout.json',
    JSON.stringify(
      { tripId, parentId: userId, obligationId: obligation.id, cents: 100, ...order },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  if (!order.approvalUrl)
    throw Error('No new buyer approval link is available; inspect this preparation privately.');
  await writeFile(
    '.data/hosted/checkout-instructions.txt',
    [
      'CLASSEQUITY — NEW HOSTED WEBHOOK SANDBOX CHECK',
      'Fictional obligation: Morgan Sandbox Webhook Example — Hosted webhook verification.',
      'Exactly one USD 1.00 seat. The previous financial-closure transaction is untouched.',
      'Order preparation does not authorize capture or refund. No buyer credentials are requested or stored.',
      'Open this private PayPal Sandbox checkout URL and approve manually:',
      order.approvalUrl,
      'Return to Codex to confirm approval and authorize exactly one USD 1 capture, an idempotent duplicate-request check, genuine event resend checks, and one full refund up to USD 1.',
      'Do not click Finalize approved payment yourself while Codex is carrying out that separately authorized check.',
      'The browser return to /parent may require a separate invitation; it does not capture automatically.',
      'Do not share this file, the checkout URL, or buyer credentials publicly.',
    ].join('\n') + '\n',
    { mode: 0o600 },
  );
  console.log({
    prepared: true,
    fictionalObligation: 'Morgan Sandbox Webhook Example — Hosted webhook verification',
    currency: 'USD',
    cents: 100,
    status: order.status,
    capturePerformed: false,
    refundPerformed: false,
    privateInstructions: '.data/hosted/checkout-instructions.txt',
  });
}
main()
  .catch(() => {
    console.error(
      'Hosted sandbox preparation failed; inspect privately. No capture or refund was requested.',
    );
    process.exitCode = 1;
  })
  .finally(closeDatabase);

// Explicitly requested controlled sandbox preparation. No capture or refund.
import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db, closeDatabase } from '../src/db';
import * as s from '../src/db/schema';
import { createTrip, register, freeze } from '../src/server/services';
import { paymentOrder } from '../src/server/payments';
import { paypal, ProviderFailure } from '../src/server/integrations/paypal';
import type { Actor } from '../src/server/auth';
async function main() {
  if (process.env.PAYPAL_ENV !== 'sandbox') throw Error('Sandbox required');
  const original = JSON.parse(await readFile('.data/sandbox-checkout.json', 'utf8'));
  const [old] = await db
    .select()
    .from(s.operations)
    .where(eq(s.operations.id, original.operationId));
  if (!old || old.mode !== 'sandbox' || !old.orderId) throw Error('Original operation missing');
  try {
    await paypal.order(old.orderId);
    console.log(
      'Original order remains readable. Reuse its private existing handoff; no replacement created.',
    );
    return;
  } catch (e) {
    if (!(e instanceof ProviderFailure) || e.providerCode !== 'INVALID_RESOURCE_ID') throw e;
  }
  // Preserve the unavailable original order/obligation. Do not reset its identity or infer it unpaid.
  // Section 4 of the closure request authorizes a replacement if the old checkout cannot be reused.
  const path = '.data/financial-closure-checkout.json';
  let prepared:
    | {
        tripId: string;
        obligationId?: string;
        operationId?: string;
        approvalUrl?: string | null;
        status?: string;
      }
    | undefined;
  try {
    prepared = JSON.parse(await readFile(path, 'utf8'));
  } catch {}
  const [family] = await db
    .select()
    .from(s.registrations)
    .where(eq(s.registrations.tripId, 'sandbox-science'));
  if (!family) throw Error('Existing fictional family missing');
  const admin: Actor = {
    schoolId: 'sandbox-school',
    userId: 'sandbox-admin',
    name: 'Sandbox admin',
    role: 'admin',
    mode: 'sandbox',
  };
  const parent: Actor = {
    ...admin,
    userId: family.parentId,
    role: 'parent',
    name: 'Sandbox Demo Family',
  };
  await mkdir('.data', { recursive: true });
  if (!prepared) {
    const tripId = await createTrip(admin, {
      name: 'Financial closure verification',
      destination: 'Fictional sandbox workshop',
      description:
        'One fictional one-dollar seat for controlled sandbox verification; no real school activity.',
      date: '2026-12-01',
      deadline: '2026-11-30',
      capacity: 1,
      tiers: [{ min: 1, cents: 100 }],
    });
    prepared = { tripId };
    await writeFile(path, JSON.stringify(prepared, null, 2), { mode: 0o600 });
  }
  let [reg] = await db
    .select()
    .from(s.registrations)
    .where(eq(s.registrations.tripId, prepared.tripId));
  if (!reg)
    await register(parent, prepared.tripId, {
      student: 'Avery Sandbox Closure Example',
      consent: true,
      ceilingCents: 100,
    });
  [reg] = await db
    .select()
    .from(s.registrations)
    .where(eq(s.registrations.tripId, prepared.tripId));
  const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, prepared.tripId));
  if (trip.state === 'OPEN') await freeze(admin, prepared.tripId);
  const [ob] = await db
    .select()
    .from(s.obligations)
    .where(eq(s.obligations.registrationId, reg.id));
  if (ob.cents !== 100) throw Error('Unexpected obligation amount');
  const result = await paymentOrder(parent, ob.id);
  await writeFile(
    path,
    JSON.stringify({ ...prepared, obligationId: ob.id, ...result }, null, 2) + '\n',
    { mode: 0o600 },
  );
  await writeFile(
    'docs/financial-checkout-preparation.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        provider: 'PayPal sandbox',
        reason:
          'Original order readback returned INVALID_RESOURCE_ID; original records preserved without assuming an unpaid outcome',
        fictionalObligation: 'Avery Sandbox Closure Example — Financial closure verification',
        currency: 'USD',
        cents: 100,
        orderCreated: !!result.approvalUrl,
        status: result.status,
        buyerApprovalCompleted: false,
        captureVerified: false,
        refundVerified: false,
        privateHandoff: '.data/financial-closure-checkout.json',
      },
      null,
      2,
    ) + '\n',
  );
  console.log({
    provider: 'PayPal sandbox',
    currency: 'USD',
    cents: 100,
    status: result.status,
    orderCreated: !!result.approvalUrl,
    buyerApprovalCompleted: false,
    captureVerified: false,
    refundVerified: false,
  });
}
main()
  .catch((e) => {
    console.error({
      status: 'BLOCKED',
      code: e instanceof ProviderFailure ? e.providerCode : 'PREPARATION_FAILED',
      noCaptureOrRefund: true,
    });
    process.exitCode = 1;
  })
  .finally(closeDatabase);

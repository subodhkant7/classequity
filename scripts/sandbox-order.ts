import 'dotenv/config';
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, closeDatabase } from '../src/db';
import * as s from '../src/db/schema';
import { uid, register, freeze } from '../src/server/services';
import { paymentOrder } from '../src/server/payments';
import type { Actor } from '../src/server/auth';
import { writeFile, mkdir } from 'node:fs/promises';
async function main() {
  const a: Actor = {
    userId: 'sandbox-admin',
    schoolId: 'sandbox-school',
    name: 'Sandbox admin',
    role: 'admin',
    mode: 'sandbox',
  };
  const tripId = 'sandbox-science';
  let [reg] = await db.select().from(s.registrations).where(eq(s.registrations.tripId, tripId));
  if (!reg) {
    const userId = uid();
    await db
      .insert(s.users)
      .values({ id: userId, name: 'Sandbox Demo Family', email: `${userId}@example.test` });
    await db
      .insert(s.memberships)
      .values({ id: uid(), schoolId: a.schoolId, userId, role: 'parent' });
    await register({ ...a, userId, role: 'parent' }, tripId, {
      student: 'Avery Sandbox Example',
      consent: true,
      ceilingCents: 3200,
    });
    [reg] = await db.select().from(s.registrations).where(eq(s.registrations.tripId, tripId));
    await freeze(a, tripId);
  }
  const [ob] = await db
    .select()
    .from(s.obligations)
    .where(eq(s.obligations.registrationId, reg.id));
  if (!ob) throw Error('Prepared sandbox obligation is missing.');
  const parent: Actor = { ...a, userId: reg.parentId, role: 'parent', name: 'Sandbox Demo Family' };
  const result = await paymentOrder(parent, ob.id);
  await mkdir('.data', { recursive: true });
  await writeFile(
    '.data/sandbox-checkout.json',
    JSON.stringify({ tripId, obligationId: ob.id, ...result }, null, 2),
    { mode: 0o600 },
  );
  await writeFile(
    'docs/sandbox-order-evidence.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        provider: 'PayPal sandbox',
        operationFingerprint: createHash('sha256').update(result.operationId).digest('hex'),
        orderCreated: !!result.approvalUrl,
        status: result.status,
        currency: 'USD',
        cents: ob.cents,
        buyerApprovalCompleted: false,
        captureVerified: false,
        note: 'A genuine server-created sandbox order. Approval URL is stored privately under .data/sandbox-checkout.json. No buyer approval was automated.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log({
    orderCreated: !!result.approvalUrl,
    status: result.status,
    amountCents: ob.cents,
    buyerApprovalCompleted: false,
  });
}
main()
  .catch((e) => {
    console.error({
      status: 'UNVERIFIED',
      code: typeof e === 'object' && e && 'code' in e ? e.code : 'PROVIDER_OR_CONFIGURATION_ERROR',
    });
    process.exitCode = 1;
  })
  .finally(closeDatabase);

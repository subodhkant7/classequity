import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, closeDatabase } from '../src/db';
import * as s from '../src/db/schema';
import { syntheticNames } from '../src/lib/domain';
export async function seed() {
  await db.transaction(async (tx) => {
    const tiers = [
      { min: 1, cents: 3200 },
      { min: 20, cents: 2700 },
      { min: 30, cents: 2300 },
    ];
    for (const mode of ['demo', 'sandbox'] as const) {
      const schoolId = `${mode}-school`;
      if ((await tx.select().from(s.schools).where(eq(s.schools.id, schoolId))).length) continue;
      await tx.insert(s.schools).values({ id: schoolId, name: 'Oakwood Academy', mode });
      for (const role of ['admin', 'finance', 'teacher'] as const) {
        const userId = `${mode}-${role}`;
        await tx
          .insert(s.users)
          .values({
            id: userId,
            name:
              role === 'finance' ? 'Priya Shah' : role === 'admin' ? 'Alex Morgan' : 'Jamie Wilson',
            email: `${userId}@example.test`,
          });
        await tx.insert(s.memberships).values({ id: userId, schoolId, userId, role });
      }
      const tripId = `${mode}-science`;
      await tx
        .insert(s.trips)
        .values({
          id: tripId,
          schoolId,
          name: 'A day of discovery',
          destination: 'Exploratorium Science Museum',
          description:
            'An immersive day of science, curiosity, and hands-on learning. Includes museum admission, a guided workshop, and return transport. Bring a packed lunch and a water bottle. Depart school at 8:30 AM; return at 4:00 PM. Synthetic hackathon activity.',
          date: '2026-11-20',
          deadline: '2026-11-15',
          capacity: 40,
          tiers,
          state: mode === 'demo' ? 'FROZEN' : 'OPEN',
        });
      if (mode === 'demo') {
        await tx
          .insert(s.snapshots)
          .values({ id: 'demo-snapshot', tripId, seatCents: 2300, count: 30, policy: tiers });
        for (let n = 0; n < 30; n++) {
          const userId = `demo-parent-${n + 1}`,
            regId = `demo-registration-${n + 1}`;
          await tx
            .insert(s.users)
            .values({
              id: userId,
              name: `Family ${String(n + 1).padStart(2, '0')}`,
              email: `family${n + 1}@example.test`,
            });
          await tx.insert(s.memberships).values({ id: userId, schoolId, userId, role: 'parent' });
          await tx
            .insert(s.registrations)
            .values({ id: regId, tripId, parentId: userId, student: syntheticNames[n] });
          await tx
            .insert(s.consents)
            .values({
              id: `consent-${regId}`,
              registrationId: regId,
              ceilingCents: 3200,
              accepted: true,
            });
          if (n >= 25)
            await tx
              .insert(s.assistance)
              .values({
                id: `assistance-${regId}`,
                registrationId: regId,
                tripId,
                status: 'APPROVED',
                cents: 2300,
                approvedBy: 'demo-finance',
              });
          const obligationId = `demo-obligation-${n + 1}`;
          await tx
            .insert(s.obligations)
            .values({
              id: obligationId,
              tripId,
              snapshotId: 'demo-snapshot',
              userId,
              registrationId: regId,
              kind: 'SEAT',
              cents: n >= 25 ? 0 : 2300,
            });
          if (n < 25) {
            const status =
              n < 21
                ? 'COMPLETED'
                : n === 21
                  ? 'PENDING'
                  : n === 22
                    ? 'FAILED'
                    : n === 23
                      ? 'UNKNOWN'
                      : 'CREATED';
            const operationId = `demo-payment-${n + 1}`;
            await tx
              .insert(s.operations)
              .values({
                id: operationId,
                obligationId,
                schoolId,
                mode,
                requestKey: `${operationId}-create`,
                orderId: `SIM-ORDER-${n + 1}`,
                status,
              });
            if (n < 21)
              await tx
                .insert(s.captures)
                .values({
                  id: `demo-capture-${n + 1}`,
                  operationId,
                  providerId: `SIM-CAPTURE-${n + 1}`,
                  cents: 2300,
                  feeCents: 85,
                  feeKnown: true,
                  provenance: 'SYNTHETIC',
                  status: 'COMPLETED',
                });
          }
        }
        for (const [n, cents] of [5000, 2000, 4500].entries()) {
          const id = `demo-sponsor-${n + 1}`,
            obligationId = `${id}-obligation`,
            operationId = `${id}-payment`;
          await tx
            .insert(s.commitments)
            .values({ id, tripId, userId: `demo-parent-${n + 1}`, cents });
          await tx
            .insert(s.obligations)
            .values({
              id: obligationId,
              tripId,
              snapshotId: 'demo-snapshot',
              userId: `demo-parent-${n + 1}`,
              commitmentId: id,
              kind: 'SPONSOR',
              cents,
            });
          await tx
            .insert(s.operations)
            .values({
              id: operationId,
              obligationId,
              schoolId,
              mode,
              requestKey: `${operationId}-create`,
              orderId: `SIM-SPONSOR-${n + 1}`,
              status: n < 2 ? 'COMPLETED' : 'PENDING',
            });
          if (n < 2)
            await tx
              .insert(s.captures)
              .values({
                id: `${id}-capture`,
                operationId,
                providerId: `SIM-SPONSOR-CAPTURE-${n + 1}`,
                cents,
                feeCents: n === 0 ? 200 : 85,
                feeKnown: true,
                provenance: 'SYNTHETIC',
                status: 'COMPLETED',
              });
        }
        await tx
          .insert(s.conversations)
          .values({
            id: 'demo-conversation',
            schoolId,
            tripId,
            userId: 'demo-parent-23',
            phone: 'whatsapp:+15550100023',
            optedIn: true,
            lastInboundAt: new Date(),
          });
        await tx.insert(s.messages).values([
          {
            id: 'demo-message-1',
            conversationId: 'demo-conversation',
            direction: 'INBOUND',
            body: 'What is the price for the museum trip?',
            status: 'received',
            simulation: true,
          },
          {
            id: 'demo-message-2',
            conversationId: 'demo-conversation',
            direction: 'OUTBOUND',
            body: 'The final group price is $23 per seat with 30 registrations. Payment is due November 15. Open your secure parent portal to view your own payment details.',
            status: 'delivered',
            simulation: true,
          },
        ]);
        await tx
          .insert(s.audit)
          .values({
            id: 'demo-seed-audit',
            schoolId,
            userId: 'demo-admin',
            action: 'DEMO_SEEDED',
            entityId: tripId,
            detail: { synthetic: true },
          });
      }
    }
  });
  console.log(
    'Seed complete: fictional demo school and isolated sandbox school. Existing records preserved.',
  );
}
if (process.argv[1]?.endsWith('scripts/seed.ts'))
  seed()
    .catch(() => {
      console.error('Seed failed; inspect database and migrations.');
      process.exitCode = 1;
    })
    .finally(closeDatabase);

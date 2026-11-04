import 'dotenv/config';
import { db, closeDatabase } from '../src/db';
import { registrations } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { secureLink } from '../src/server/messaging';
import { writeFile, mkdir } from 'node:fs/promises';
async function main() {
  const [r] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.tripId, 'sandbox-science'));
  if (!r) throw Error('Prepare sandbox order first');
  const url = await secureLink(
    {
      userId: r.parentId,
      schoolId: 'sandbox-school',
      role: 'parent',
      mode: 'sandbox',
      name: 'Sandbox Demo Family',
    },
    r.tripId,
  );
  await mkdir('.data', { recursive: true });
  await writeFile('.data/parent-invitation.txt', url + '\n', { mode: 0o600 });
  console.log(
    'A single-use 15-minute sandbox parent invitation was saved privately to .data/parent-invitation.txt. No buyer approval or payment was performed.',
  );
}
main()
  .catch(() => {
    console.error('Sandbox handoff not ready');
    process.exitCode = 1;
  })
  .finally(closeDatabase);

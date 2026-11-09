import 'dotenv/config';
import { db, closeDatabase } from '../src/db';
import { registrations } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { secureLink } from '../src/server/messaging';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
async function main() {
  let checkout: { tripId: string; approvalUrl?: string } | undefined;
  try {
    checkout = JSON.parse(await readFile('.data/financial-closure-checkout.json', 'utf8'));
  } catch {}
  const tripId = checkout?.tripId || 'sandbox-science';
  const [r] = await db.select().from(registrations).where(eq(registrations.tripId, tripId));
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
  await writeFile(
    '.data/financial-checkout-instructions.txt',
    [
      'Private ClassEquity sandbox verification handoff',
      'Fictional obligation: Avery Sandbox Closure Example — Financial closure verification',
      'Amount: USD 1.00. No live money. No capture or refund has been performed.',
      '',
      '1. Open this single-use parent invitation within 15 minutes:',
      url,
      '2. Select My payments & receipts, then Open PayPal sandbox checkout.',
      '3. A human signs in to a personal sandbox buyer and approves USD 1.00. Never share the password.',
      '4. After approval, reopen the exact parent activity below (the already-created checkout may return to the default activity):',
      `${process.env.APP_URL || 'http://localhost:3000'}/parent?trip=${tripId}`,
      '5. Tell Codex that buyer approval is complete and explicitly authorize one USD 1.00 capture and one full refund up to USD 1.00.',
      'Do not click Finalize approved payment until the controlled test is authorized.',
      '',
      ...(checkout?.approvalUrl
        ? ['Existing PayPal approval URL (private):', checkout.approvalUrl]
        : []),
    ].join('\n') + '\n',
    { mode: 0o600 },
  );
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

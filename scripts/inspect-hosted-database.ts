import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import { db, closeDatabase } from '../src/db';

// Read-only preservation evidence. No provider identifiers or personal fields leave
// this process: complete financial rows are reduced to a one-way fingerprint.
async function main() {
  if (!process.env.DATABASE_URL) throw Error('Existing PostgreSQL required.');
  const historical = JSON.parse(await readFile('.data/financial-closure-checkout.json', 'utf8'));
  if (typeof historical.operationId !== 'string')
    throw Error('Historical operation identity required.');
  const report = await db.transaction(async (tx) => {
    await tx.execute(sql`SET TRANSACTION READ ONLY`);
    await tx.execute(sql`SET LOCAL statement_timeout = '10000ms'`);
    const [result] = await tx.execute(sql`SELECT current_database() AS database,
      (SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM ce_payment_operations o WHERE mode='sandbox') AS operations,
      (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM ce_paypal_captures c JOIN ce_payment_operations o ON o.id=c.operation_id WHERE o.mode='sandbox') AS captures,
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM ce_refund_operations r JOIN ce_paypal_captures c ON c.id=r.capture_id JOIN ce_payment_operations o ON o.id=c.operation_id WHERE o.mode='sandbox') AS refunds,
      (SELECT count(*)::int FROM ce_migrations) AS migrations,
      (SELECT count(*)::int FROM ce_trips WHERE school_id='demo-school') AS demo_trips,
      (SELECT count(*)::int FROM ce_paypal_captures WHERE operation_id=${historical.operationId} AND provenance='PAYPAL_SANDBOX' AND cents=100 AND refunded_cents=100 AND fee_cents=54 AND status='REFUNDED') AS original_evidence_count`);
    if (result.database !== 'classequity') throw Error('Unexpected database.');
    const operations = Array.isArray(result.operations)
      ? (result.operations as Record<string, unknown>[])
      : [];
    const captures = Array.isArray(result.captures)
      ? (result.captures as Record<string, unknown>[])
      : [];
    const refunds = Array.isArray(result.refunds)
      ? (result.refunds as Record<string, unknown>[])
      : [];
    const original = captures.filter(
      (c) =>
        c.operation_id === historical.operationId &&
        c.provenance === 'PAYPAL_SANDBOX' &&
        c.cents === 100 &&
        c.refunded_cents === 100 &&
        c.fee_cents === 54 &&
        c.status === 'REFUNDED',
    );
    return {
      checkedAt: new Date().toISOString(),
      database: result.database,
      migrations: result.migrations,
      demoTrips: result.demo_trips,
      originalEvidenceCount: result.original_evidence_count,
      originalEvidenceFingerprint: createHash('sha256')
        .update(
          JSON.stringify([
            operations.filter((o) => original.some((c) => c.operation_id === o.id)),
            original,
            refunds.filter((r) => original.some((c) => c.id === r.capture_id)),
          ]),
        )
        .digest('hex'),
      sandboxLedgerFingerprint: createHash('sha256')
        .update(JSON.stringify([result.operations, result.captures, result.refunds]))
        .digest('hex'),
    };
  });
  await mkdir('.data/hosted', { recursive: true, mode: 0o700 });
  const name = process.argv[2] || 'database-latest';
  if (!/^[a-z0-9-]+$/.test(name)) throw Error('Use a simple evidence filename.');
  await writeFile(`.data/hosted/${name}.json`, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(report);
}
main()
  .catch(() => {
    console.error('Read-only database evidence check failed.');
    process.exitCode = 1;
  })
  .finally(closeDatabase);

import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db, closeDatabase } from '../src/db';
async function main() {
  const info = await db.execute(sql`select current_database() as name`);
  const name = info[0]?.name;
  if (
    process.env.DATABASE_URL &&
    name !== 'classequity' &&
    process.env.ALLOW_LOCAL_DATABASE !== 'true'
  )
    throw Error('Refusing migration: expected dedicated classequity database');
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS ce_migrations (name text PRIMARY KEY, hash text NOT NULL, applied_at timestamptz DEFAULT now())`,
  );
  const files = (await readdir('drizzle')).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const content = await readFile(`drizzle/${file}`, 'utf8');
    const hash = createHash('sha256').update(content).digest('hex');
    const prior = await db.execute(sql`SELECT hash FROM ce_migrations WHERE name=${file}`);
    if (prior.length) {
      if (prior[0].hash !== hash) throw Error('Migration hash mismatch');
      continue;
    }
    const reviewed = content.replace(
      'ALTER TABLE \"ce_refund_operations\" DROP CONSTRAINT \"ce_refund_operations_capture_id_unique\";',
      '',
    );
    if (/\b(DROP|TRUNCATE)\b/i.test(reviewed)) throw Error('Destructive migration refused');
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(742601)`);
      for (const part of content.split('--> statement-breakpoint'))
        if (part.trim()) await tx.execute(sql.raw(part));
      await tx.execute(sql`INSERT INTO ce_migrations(name,hash) VALUES(${file},${hash})`);
    });
    console.log(`Applied ${file}`);
  }
  console.log(`Migration check passed: ${files.length} non-destructive migrations`);
}
main()
  .catch(() => {
    console.error('Migration failed. Check dedicated database connectivity and migration safety.');
    process.exitCode = 1;
  })
  .finally(closeDatabase);

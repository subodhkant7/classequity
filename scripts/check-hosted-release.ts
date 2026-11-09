import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db, closeDatabase } from '../src/db';
import { validateHostedConfig } from '../src/lib/hosted-config';

// Free Render services have no pre-deploy jobs. This build-time gate is READ ONLY:
// it refuses an unprepared database instead of migrating or seeding on restarts.
async function main() {
  validateHostedConfig(process.env);
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET TRANSACTION READ ONLY`);
    await tx.execute(sql`SET LOCAL statement_timeout = '5000ms'`);
    const [database] = await tx.execute(sql`SELECT current_database() AS name`);
    if (database.name !== 'classequity') throw Error('Unexpected database.');
    const migrations = await tx.execute(sql`SELECT name, hash FROM ce_migrations`);
    const files = (await readdir('drizzle')).filter((f) => f.endsWith('.sql')).sort();
    if (migrations.length !== files.length)
      throw Error('Review pending database migrations separately.');
    for (const file of files) {
      const digest = createHash('sha256')
        .update(await readFile(`drizzle/${file}`))
        .digest('hex');
      if (!migrations.some((m) => m.name === file && m.hash === digest))
        throw Error('Database migration checksum mismatch.');
    }
    const [schools] = await tx.execute(sql`SELECT count(*)::int AS count FROM ce_schools
      WHERE (id='demo-school' AND mode='demo') OR (id='sandbox-school' AND mode='sandbox')`);
    if (schools.count !== 2) throw Error('Expected fictional workspaces are missing.');
  });
  console.log(
    'Hosted release check passed: sandbox configuration, existing schema and fictional workspaces; no database writes.',
  );
}
main()
  .catch(() => {
    console.error(
      'Hosted release check failed. Review private configuration, connectivity and existing schema; no setup was replayed.',
    );
    process.exitCode = 1;
  })
  .finally(closeDatabase);

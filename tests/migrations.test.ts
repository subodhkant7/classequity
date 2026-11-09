import { test, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const run = promisify(execFile);
test('repeating local migrations and seeding preserves prepared data and checksums', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'classequity-migrate-'));
  const env = { ...process.env, DATABASE_URL: '', LOCAL_DATABASE_DIR: directory };
  try {
    const first = await run(process.execPath, ['--import', 'tsx', 'scripts/migrate.ts'], { env });
    expect(first.stdout).toContain('Applied 0000');
    await run(process.execPath, ['--import', 'tsx', 'scripts/seed.ts'], { env });
    const repeat = await run(process.execPath, ['--import', 'tsx', 'scripts/migrate.ts'], { env });
    expect(repeat.stdout).not.toContain('Applied ');
    expect(repeat.stdout).toContain('Migration check passed: 3');
    await run(process.execPath, ['--import', 'tsx', 'scripts/seed.ts'], { env });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);

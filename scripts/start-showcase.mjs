import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
// A separate local-only product preview. Stored credentials and shared data are never changed.
const env = {
  ...process.env,
  DATABASE_URL: '',
  LOCAL_DATABASE_DIR: '.data/experience-preview',
  APP_URL: 'http://localhost:3100',
  CE_PREVIEW_ISOLATED: 'true',
  SESSION_SECRET: randomBytes(32).toString('hex'),
  ADMIN_PASSWORD: randomBytes(32).toString('hex'),
  GEMINI_API_KEY: '',
  PAYPAL_CLIENT_ID: '',
  PAYPAL_CLIENT_SECRET: '',
  TWILIO_ACCOUNT_SID: '',
  TWILIO_AUTH_TOKEN: '',
  DEMO_MODE: 'true',
};
let child;
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    child?.kill(signal);
  });
function run(args) {
  return new Promise((resolve, reject) => {
    child = spawn(process.execPath, args, { env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code, signal) =>
      code === 0 || signal ? resolve() : reject(Error('Showcase command failed')),
    );
  });
}
try {
  await run(['--import', 'tsx', 'scripts/migrate.ts']);
  await run(['--import', 'tsx', 'scripts/seed.ts']);
  console.log(
    'Local-only ClassEquity showcase: http://localhost:3100 · isolated fictional data · providers disabled',
  );
  await run([
    'node_modules/next/dist/bin/next',
    'dev',
    '--webpack',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3100',
  ]);
} catch {
  console.error(
    'Could not start the local showcase. Check Node 22, installed dependencies and that port 3100 is free.',
  );
  process.exitCode = 1;
}

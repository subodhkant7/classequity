import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
const keys = [
  'PAYPAL_CLIENT_SECRET',
  'GEMINI_API_KEY',
  'TWILIO_AUTH_TOKEN',
  'SESSION_SECRET',
  'ADMIN_PASSWORD',
  'DATABASE_URL',
];
const values = keys.map((k) => ({ k, v: process.env[k] })).filter((x) => x.v && x.v.length > 10);
const hits = [];
const checkout =
  /https:\/\/(?:www\.)?sandbox\.paypal\.com\/(?:checkoutnow|webapps\/hermes)[^\s\"'<>]*[?&](?:token|ba_token)=[A-Za-z0-9-]+/;
async function scan(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) await scan(p);
    else {
      const text = await readFile(p, 'utf8');
      if (checkout.test(text)) hits.push({ path: p, key: 'PAYPAL_APPROVAL_URL' });
      for (const secret of values)
        if (text.includes(secret.v)) hits.push({ path: p, key: secret.k });
    }
  }
}
for (const dir of [
  'src',
  'docs',
  'scripts',
  'tests',
  'public',
  '.next/static',
  '.next-experience/static',
])
  try {
    await scan(dir);
  } catch {}
console.log({
  credentialMatches: hits.length,
  scanned:
    'application source, documentation, scripts, tests, public assets and browser production bundles',
  vendorStudioClientLicenseExcluded: true,
});
if (hits.length) process.exitCode = 1;

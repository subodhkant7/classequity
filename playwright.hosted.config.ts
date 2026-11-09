import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.E2E_HOSTED_URL;
if (
  !baseURL ||
  !baseURL.startsWith('https://') ||
  !new URL(baseURL).hostname.endsWith('.onrender.com')
)
  throw Error('Set E2E_HOSTED_URL to the verified Render HTTPS origin.');
export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/showcase.spec.ts', 'hosted/**/*.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  expect: { timeout: 20000 },
  reporter: [['list'], ['json', { outputFile: 'output/playwright/hosted-results.json' }]],
  use: { baseURL, trace: 'off', video: 'off', screenshot: 'off' },
  projects: [{ name: 'hosted-chromium', use: { ...devices['Desktop Chrome'] } }],
  // No local server and no operational mutation specs. Public interactions plus
  // read-only hosted business checks; only sessions/quotas/report presentation persist.
});

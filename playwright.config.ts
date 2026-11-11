import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const origin = new URL(baseURL);
const databaseUrl = process.env.DATABASE_URL || '';
const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
if (!loopback.has(origin.hostname) || (databaseUrl && !loopback.has(new URL(databaseUrl).hostname))) {
  throw new Error('The mutation-capable E2E suite requires a loopback app and database.');
}
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'output/playwright/results.json' }]],
  use: { baseURL, trace: process.env.E2E_TRACE === 'off' ? 'off' : 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      process.env.E2E_PRODUCTION === 'true'
        ? `npm run start -- --port ${new URL(baseURL).port || '3000'}`
        : `npm run dev -- --webpack --port ${new URL(baseURL).port || '3000'}`,
    url: baseURL,
    reuseExistingServer: false,
    env: {
      APP_URL: origin.origin,
      DATABASE_URL: databaseUrl,
      PAYPAL_ENV: 'sandbox',
      PAYPAL_CLIENT_ID: '',
      PAYPAL_CLIENT_SECRET: '',
      PAYPAL_WEBHOOK_ID: '',
      TWILIO_ACCOUNT_SID: '',
      TWILIO_AUTH_TOKEN: '',
      GEMINI_API_KEY: '',
    },
    timeout: 120000,
  },
});

import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'output/playwright/results.json' }]],
  use: { baseURL, trace: process.env.E2E_TRACE === 'off' ? 'off' : 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --webpack --port ${new URL(baseURL).port || '3000'}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

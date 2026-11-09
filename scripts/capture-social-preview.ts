import { chromium } from '@playwright/test';
const base = process.env.E2E_BASE_URL || 'http://localhost:3000';
if (new URL(base).hostname !== 'localhost') throw Error('Use a local ClassEquity preview');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(`${base}/social-preview.svg`);
  await page.screenshot({ path: 'public/social-preview.png' });
  console.log('Original social vector rendered to public/social-preview.png');
} finally {
  await browser.close();
}

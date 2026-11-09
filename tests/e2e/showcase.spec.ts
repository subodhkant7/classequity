import { test, expect } from '@playwright/test';
const origin = process.env.E2E_BASE_URL || 'http://localhost:3000';
async function noOverflow(page: import('@playwright/test').Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
}
test('public hero, deterministic calculator and threshold keyboard interaction', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Every child deserves a place in the adventure.',
  );
  await expect(
    page.getByRole('link', { name: 'Explore Interactive Demo', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.locator('.hero h1').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  await page.screenshot({ path: 'output/playwright/showcase/home-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'See How It Works', exact: true }).click();
  const range = page.getByRole('slider', { name: 'Number of students' });
  await range.focus();
  await range.press('Home');
  for (let n = 1; n < 30; n++) await range.press('ArrowRight');
  await expect(range).toHaveValue('30');
  await expect(page.locator('.pricing-head strong')).toHaveText('$23.00');
  await expect(page.locator('.price-summary')).toContainText('$690.00 total');
  await expect(page.locator('.price-summary')).toContainText('$270.00');
  await range.press('ArrowLeft');
  await expect(range).toHaveValue('29');
  await expect(page.locator('.pricing-head strong')).toHaveText('$27.00');
  await noOverflow(page);
  expect(errors).toEqual([]);
});
test('funding visualization separates promises, actual money and fees', async ({ page }) => {
  await page.goto('/how-it-works#funding');
  await expect(page.getByTestId('simulator-net')).toHaveText('$532.30');
  await expect(page.getByTestId('simulator-gap')).toHaveText('$157.70');
  await page.getByLabel('Sponsor commitments (USD)', { exact: true }).fill('690');
  await expect(page.getByTestId('simulator-net')).toHaveText('$532.30');
  await page.getByLabel('Confirmed sponsor payments (USD)', { exact: true }).fill('227.70');
  await expect(page.getByTestId('simulator-gap')).toHaveText('$0.00');
  await page.getByRole('button', { name: 'Reset funding example' }).click();
  await expect(page.getByTestId('simulator-gap')).toHaveText('$157.70');
  await page.screenshot({ path: 'output/playwright/showcase/funding-lab.png', fullPage: true });
});
test('payment state viewer handles unknown and duplicate examples beside recorded evidence', async ({
  page,
}) => {
  await page.goto('/how-it-works#payment-states');
  await page.getByLabel('Payment example outcome').selectOption('unknown');
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'Next state', exact: true }).click();
  await expect(page.locator('.state-stamp')).toHaveText('UNKNOWN');
  await expect(page.locator('.recorded-evidence')).toContainText('-$0.54');
  await page.getByLabel('Payment example outcome').selectOption('verified');
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'Next state', exact: true }).click();
  await page.getByRole('button', { name: 'Repeat illustrative capture request' }).click();
  await expect(page.getByRole('status')).toContainText('One capture');
});
test('six-chapter tour, local reset and actual AG Studio work without authenticated APIs', async ({
  page,
}) => {
  test.setTimeout(120000);
  const apiCalls: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/'))
      apiCalls.push(`${r.method()} ${new URL(r.url()).pathname}`);
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Plan an adventure', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next chapter' }).click();
  await page.getByRole('button', { name: 'Review extracted fields' }).click();
  await expect(page.getByText('3200 · 2700 · 2300')).toBeVisible();
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('status').first()).toContainText('No activity or price was saved');
  await page.getByRole('button', { name: 'Next chapter' }).click();
  await expect(page.getByRole('button', { name: 'Add fictional registration' })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Add fictional registration' }).click();
  await expect(page.getByText('20 fictional registrations.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'हिन्दी', exact: true }).click();
  await expect(page.locator('.answer')).toHaveAttribute('lang', 'hi');
  await page.getByRole('button', { name: 'Next chapter' }).click();
  await page.getByRole('button', { name: 'Finance', exact: true }).click();
  await expect(page.locator('.privacy-views')).toContainText('reveals no recipients');
  await page.getByRole('button', { name: 'Next chapter' }).click();
  await expect(page.locator('.recorded-evidence')).toContainText('Recorded provider evidence');
  await page.getByRole('button', { name: 'Next chapter' }).click();
  await expect(page.getByText('Group Unlock', { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });
  await page.getByLabel('Report page').selectOption('Funding & covered seats');
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30000 });
  await page.getByLabel('Report page').selectOption('Payment reconciliation');
  await expect(page.locator('.ag-root').first()).toBeVisible({ timeout: 30000 });
  await page.locator('.ag-root').first().scrollIntoViewIfNeeded();
  await expect(
    page.locator('.ag-root').first().getByRole('gridcell', { name: '$20.70', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.ag-root').first().getByRole('gridcell', { name: '$532.30', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'output/playwright/showcase/tour-studio.png', fullPage: true });
  await page.getByRole('button', { name: 'Replay recorded AI view' }).click();
  await expect(page.getByLabel('Report page')).toHaveValue('Recorded AI · Trip comparison');
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.getByRole('button', { name: 'Reset demonstration' }).click();
  await expect(page.getByRole('heading', { name: 'Plan an adventure', exact: true })).toBeFocused();
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
});
test('mobile navigation, deep links, replay and reduced motion remain usable at 390px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.locator('.hero h1').evaluate((el) => getComputedStyle(el).animationName)).toBe(
    'none',
  );
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Product' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await page.screenshot({ path: 'output/playwright/showcase/home-mobile.png', fullPage: true });
  await noOverflow(page);
  for (const path of ['/how-it-works', '/technology', '/demo?chapter=families']) {
    await page.goto(path);
    await noOverflow(page);
  }
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Add fictional registration' }).click();
  await page.getByRole('button', { name: 'Replay chapter' }).click();
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await page.getByRole('button', { name: 'Skip animation' }).click();
  expect(
    await page.locator('.chapter-stage').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.screenshot({ path: 'output/playwright/showcase/tour-mobile.png', fullPage: true });
});
test('public AI tabs respond to arrow keys and technology claims are bounded', async ({ page }) => {
  await page.goto('/');
  const tab = page.getByRole('tab', { name: /quotation becomes/ });
  await tab.focus();
  await tab.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /question finds/ })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('Illustrative Hindi answer');
  await page.goto('/technology');
  await expect(page.getByText('HTTPS application · PostgreSQL hosted')).toBeVisible();
  await expect(page.getByText('Authentication verified · delivery unverified')).toBeVisible();
  await expect(page.getByText('Signed sandbox lifecycle verified', { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: 'output/playwright/showcase/technology-desktop.png',
    fullPage: true,
  });
});
test('application routes share the polished shell; native modal traps and restores focus', async ({
  page,
}) => {
  test.setTimeout(150000);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Finance admin' }).click();
  await page.getByRole('button', { name: 'Enter the demo' }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  const create = page.getByRole('button', { name: 'Create a trip' });
  await create.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(create).toBeFocused();
  for (const path of [
    '/dashboard',
    '/trips',
    '/trips/demo-science',
    '/registrations',
    '/sponsorship',
    '/finance',
    '/messages',
    '/analytics',
    '/settings',
  ]) {
    await page.goto(path);
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.locator('.main .loading')).toHaveCount(0, { timeout: 30000 });
    await expect(page.locator('.main h1').first()).toBeVisible();
    await expect(page.getByText('Unable to complete this request.')).toHaveCount(0);
    await page.screenshot({
      path: `output/playwright/showcase/workspace-${path.replaceAll('/', '-')}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.locator('.sidebar')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  await noOverflow(page);
  await page.request.post('/api/auth/logout', { headers: { Origin: origin }, data: {} });
});

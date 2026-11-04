import { test, expect } from '@playwright/test';
async function login(page: import('@playwright/test').Page, role = 'School admin') {
  await page.goto('/login');
  await page.getByRole('button', { name: new RegExp(role) }).click();
  await page.getByRole('button', { name: 'Enter the demo' }).click();
  await expect(page).toHaveURL(role === 'Parent' ? /\/parent/ : /\/dashboard/, { timeout: 30000 });
}
test('landing, school overview, registration search, and actual AG Studio render', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Every child/ })).toBeVisible();
  await login(page);
  await expect(
    page.getByRole('heading', { name: 'A little planning. A lot of possibility.' }),
  ).toBeVisible();
  await expect(page.getByText('$532.30').first()).toBeVisible({ timeout: 30000 });
  await page.getByRole('link', { name: 'Registrations', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search registrations' }).fill('Avery');
  await expect(page.getByRole('cell', { name: 'Avery Chen' })).toBeVisible();
  await page.getByRole('link', { name: 'Financial intelligence', exact: true }).click();
  await page.getByRole('button', { name: 'Restore starter report' }).click();
  await expect(page.getByText('Group Unlock', { exact: true }).first()).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByText('Funding Assurance', { exact: true }).first()).toBeVisible();
  await page.getByLabel('Report page').selectOption('Funding & confirmed seats');
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20000 });
  await page.getByLabel('Report page').selectOption('Payment reconciliation');
  await expect(page.locator('.ag-root').first()).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: 'output/playwright/dashboard-analytics.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('teacher and parent authorization boundaries are enforced by API', async ({ page }) => {
  await login(page, 'Teacher');
  let response = await page.request.get('/api/trips/demo-science/finance');
  expect(response.status()).toBe(403);
  response = await page.request.get('/api/trips/sandbox-science/registrations');
  expect(response.status()).toBe(404);
  response = await page.request.get('/api/analytics');
  const safe = await response.text();
  expect(safe).not.toContain('registration-26');
  expect(safe).not.toContain('River Hayes');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await login(page, 'Parent');
  await page.getByRole('button', { name: 'My payments & receipts' }).click();
  await expect(page.getByRole('heading', { name: 'My payments & receipts' })).toBeVisible();
  response = await page.request.post('/api/payments/order', {
    headers: { Origin: 'http://localhost:3000' },
    data: { obligationId: 'demo-obligation-1' },
  });
  expect(response.status()).toBe(404);
});
test('WhatsApp simulator answers through shared service and mobile layout fits', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('link', { name: 'Communication', exact: true }).click();
  await page.getByRole('button', { name: 'What is the group price?' }).click();
  await expect(page.getByText(/group seat price is \$23.00/)).toBeVisible({ timeout: 30000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /A little planning/ })).toBeVisible({
    timeout: 30000,
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await page.screenshot({ path: 'output/playwright/dashboard-mobile.png', fullPage: true });
});

test('new trip, single-use invitation, registration consent, private support, freeze and parent receipt', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await login(page);
  await page.getByRole('button', { name: 'Create a trip' }).click();
  await page.getByLabel('Activity name', { exact: true }).fill(`Discovery workshop ${Date.now()}`);
  await page.getByLabel('Destination', { exact: true }).fill('Fictional discovery center');
  await page
    .getByLabel('Approved parent information')
    .fill('Synthetic school activity. Admission and workshop included.');
  await page.getByRole('button', { name: 'Create activity', exact: true }).click();
  await expect(page).toHaveURL(/\/trips\/[^/]+/, { timeout: 30000 });
  const tripId = new URL(page.url()).pathname.split('/').at(-1)!;
  const issued = await page.request.post(`/api/trips/${tripId}/invite`, {
    headers: { Origin: 'http://localhost:3000' },
    data: {},
  });
  expect(issued.ok()).toBe(true);
  const { url } = await issued.json();
  const parentContext = await browser.newContext();
  const family = await parentContext.newPage();
  await family.goto(url);
  await family.getByRole('button', { name: 'Open secure parent portal' }).click();
  await expect(family).toHaveURL(/\/parent\?trip=/, { timeout: 30000 });
  await family.getByLabel('Fictional student name').fill('Morgan Synthetic Example');
  await family.getByRole('checkbox').check();
  await family.getByRole('button', { name: 'Register & record consent' }).click();
  await expect(family.getByText('Registration and consent recorded.')).toBeVisible({
    timeout: 30000,
  });
  await family.getByRole('button', { name: 'Community support', exact: true }).click();
  await family
    .getByRole('button', { name: 'Request support for Morgan Synthetic Example' })
    .click();
  await expect(family.getByText(/private support request was submitted/)).toBeVisible({
    timeout: 30000,
  });
  const financeContext = await browser.newContext();
  const financePage = await financeContext.newPage();
  await login(financePage, 'Finance admin');
  const info = await financePage.request.get(`/api/trips/${tripId}/finance`);
  const restricted = await info.json();
  expect(restricted.allocations).toHaveLength(1);
  const decision = await financePage.request.post('/api/assistance/approve', {
    headers: { Origin: 'http://localhost:3000' },
    data: { id: restricted.allocations[0].id, cents: 1600 },
  });
  expect(decision.ok()).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Freeze final group price' }).click();
  await expect(page.getByText('Final price frozen.')).toBeVisible({ timeout: 30000 });
  await family.reload();
  await family.getByRole('button', { name: 'My payments & receipts', exact: true }).click();
  await expect(family.getByText('$16.00', { exact: true })).toBeVisible({ timeout: 30000 });
  await family.getByRole('button', { name: 'Simulate payment' }).click();
  await expect(family.getByText('Simulated receipt', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await family.goto(url);
  await family.getByRole('button', { name: 'Open secure parent portal' }).click();
  await expect(family.getByText('This invitation is expired or already used.')).toBeVisible();
  await parentContext.close();
  await financeContext.close();
});

import { test, expect } from '@playwright/test';
const origin = process.env.E2E_HOSTED_URL!;
test('hosted HTTPS readiness, authorization, secure cookies and tenant boundaries', async ({
  page,
}) => {
  const ready = await page.request.get('/api/health');
  expect(ready.ok()).toBe(true);
  expect(await ready.json()).toMatchObject({ status: 'ok', database: 'ready' });
  for (const route of ['/api/dashboard', '/api/analytics', '/api/trips/sandbox-science/finance'])
    expect((await page.request.get(route)).status()).toBe(401);
  await page.goto('/finance');
  await expect(page).toHaveURL(/\/login$/);
  expect(
    (
      await page.request.post('/api/auth/login', {
        headers: { Origin: origin },
        data: { mode: 'sandbox', role: 'finance', password: 'invalid-synthetic-password' },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await page.request.post('/api/auth/login', {
        headers: { Origin: 'https://unrelated.example.test' },
        data: { mode: 'demo', role: 'finance' },
      })
    ).status(),
  ).toBe(403);
  const login = await page.request.post('/api/auth/login', {
    headers: { Origin: origin },
    data: { mode: 'demo', role: 'teacher' },
  });
  expect(login.ok()).toBe(true);
  const cookie = (await page.context().cookies()).find((c) => c.name === 'ce_session');
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.secure).toBe(true);
  expect(cookie?.sameSite).toBe('Lax');
  expect((await page.request.get('/api/trips/demo-science/finance')).status()).toBe(403);
  expect((await page.request.get('/api/trips/sandbox-science/finance')).status()).toBe(404);
  expect(
    (
      await page.request.post('/api/studio/turn', {
        headers: { Origin: origin },
        data: { input: [], responseFormat: {} },
      })
    ).status(),
  ).toBe(403);
  const assistant = await page.request.post('/api/assistant', {
    headers: { Origin: origin },
    data: { tripId: 'demo-science', message: 'What is the group price?', useAI: true },
  });
  expect((await assistant.json()).source).toBe('Grounded local assistant');
  await page.request.post('/api/auth/logout', { headers: { Origin: origin }, data: {} });
  // Invalid notifications must not enter the durable authenticated inbox.
  expect(
    (
      await page.request.post('/api/webhooks/paypal', { data: { id: 'unsigned-hosted-probe' } })
    ).status(),
  ).toBe(401);
});
test('restricted sandbox Studio displays the preserved refunded evidence without payment mutations', async ({
  page,
}) => {
  test.skip(!process.env.ADMIN_PASSWORD, 'Private administrator configuration is required.');
  expect(
    (
      await page.request.post('/api/auth/login', {
        headers: { Origin: origin },
        data: { mode: 'sandbox', role: 'finance', password: process.env.ADMIN_PASSWORD },
      })
    ).ok(),
  ).toBe(true);
  const integrations = await (await page.request.get('/api/integrations')).json();
  expect(integrations.paypal).toMatchObject({
    configured: true,
    webhook: true,
    environment: 'Sandbox only',
  });
  const dashboard = await (await page.request.get('/api/dashboard')).json();
  const original = dashboard.find(
    (d: { trip: { name: string } }) => d.trip.name === 'Financial closure verification',
  );
  expect(original?.totals).toMatchObject({ gross: 100, fees: 54, refunds: 100, net: -54 });
  const mutations: string[] = [];
  page.on('request', (r) => {
    if (
      r.method() !== 'GET' &&
      /\/api\/(payments|trips|messages)\//.test(new URL(r.url()).pathname)
    )
      mutations.push(r.url());
  });
  await page.goto('/analytics');
  await expect(page.getByLabel('Report page')).toBeVisible({ timeout: 45000 });
  await page.getByLabel('Report page').selectOption('Payment reconciliation');
  await expect(page.locator('.ag-root').first()).toBeVisible({ timeout: 30000 });
  await page.locator('.ag-root').first().scrollIntoViewIfNeeded();
  await expect(
    page
      .locator('.ag-root')
      .first()
      .getByRole('gridcell', { name: 'Financial closure verification', exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page
      .locator('.studio-frame')
      .getByText('Loading...', { exact: true })
      .filter({ visible: true }),
  ).toHaveCount(0, { timeout: 30000 });
  const originalRow = page
    .locator('.ag-root')
    .first()
    .getByRole('row')
    .filter({
      has: page.getByRole('gridcell', { name: 'Financial closure verification', exact: true }),
    });
  await expect(originalRow.getByRole('gridcell', { name: '$0.54', exact: true })).toBeVisible();
  await expect(originalRow.getByRole('gridcell', { name: '-$0.54', exact: true })).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({
    path: 'output/playwright/hosted/sandbox-studio-redacted-private.png',
    fullPage: true,
  });
  expect(mutations).toEqual([]);
  await page.request.post('/api/auth/logout', { headers: { Origin: origin }, data: {} });
});

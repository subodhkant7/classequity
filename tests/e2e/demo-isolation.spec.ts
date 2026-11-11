import { test, expect, type Page } from '@playwright/test';

const base = process.env.E2E_BASE_URL || 'http://localhost:3000';

async function loginDemo(
  page: Page,
  role: 'School admin' | 'Finance admin' | 'Teacher' | 'Parent' = 'School admin',
) {
  await page.goto('/login');
  await page.getByRole('button', { name: new RegExp(role) }).click();
  await page.getByRole('button', { name: 'Enter the demo' }).click();
  await expect(page).toHaveURL(role === 'Parent' ? /\/parent/ : /\/dashboard/, { timeout: 30000 });
}

async function loginSandbox(
  page: Page,
  role: 'School admin' | 'Finance admin' | 'Teacher' = 'School admin',
) {
  const sandboxPassword = process.env.ADMIN_PASSWORD;
  expect(sandboxPassword, 'ADMIN_PASSWORD must be configured for sandbox E2E tests').toBeTruthy();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sandbox workspace' }).click();
  await page.getByRole('button', { name: new RegExp(role) }).click();
  await page.getByLabel('Sandbox administrator password').fill(sandboxPassword!);
  await page.getByRole('button', { name: 'Open sandbox workspace' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
}

test('A: dashboard, trip, and finance local previews stay isolated across independent visitors', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const ctxA = await browser.newContext({ baseURL: base });
  const ctxB = await browser.newContext({ baseURL: base });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    await loginDemo(pageA, 'Finance admin');
    await pageA.getByRole('button', { name: 'Preview 19 students ($32.00)' }).click();
    await expect(pageA.getByText('Preview updated in this browser.').first()).toBeVisible();
    await expect(pageA.getByText('$32.00 per student').first()).toBeVisible();

    await pageA.getByRole('button', { name: 'Create a trip' }).click();
    await pageA.getByLabel('Activity name', { exact: true }).fill('Local preview excursion');
    await pageA.getByLabel('Destination', { exact: true }).fill('Planetarium preview');
    await pageA
      .getByLabel('Approved parent information')
      .fill('Browser-local demo trip preview that must stay isolated from other visitors.');
    await pageA.getByRole('button', { name: 'Create activity', exact: true }).click();
    await expect(pageA.getByRole('heading', { name: 'Local preview excursion' })).toBeVisible();

    await pageA.goto('/finance?trip=demo-science');
    await pageA.getByRole('button', { name: 'Run funded scenario' }).click();
    await expect(pageA.getByText('0 unresolved operation outcomes')).toBeVisible();

    await pageA.getByLabel('USD amount', { exact: true }).fill('10.00');
    await pageA.getByLabel('Funding source', { exact: true }).fill('Local preview grant');
    await pageA
      .getByLabel('Authorization / receipt reference', { exact: true })
      .fill('LOCAL-PREVIEW-GRANT-01');
    await pageA.getByRole('button', { name: 'Record authorized contribution' }).click();
    await expect(pageA.getByText('$10.00 · Local preview grant')).toBeVisible();

    // Visitor B connects independently and must see only canonical Oakwood Academy data.
    await loginDemo(pageB, 'Finance admin');
    await expect(pageB.getByText('$23.00 per student').first()).toBeVisible();
    await expect(pageB.getByText('$532.30', { exact: true }).first()).toBeVisible();
    await expect(pageB.getByText('$157.70 still to go.')).toBeVisible();
    await expect(pageB.getByText('Preview updated in this browser.')).toHaveCount(0);
    await expect(pageB.getByText('Local preview excursion')).toHaveCount(0);

    await pageB.goto('/finance?trip=demo-science');
    await expect(pageB.getByText('$157.70', { exact: true }).first()).toBeVisible();
    await expect(pageB.getByText('Local preview grant')).toHaveCount(0);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

test('B: parent portal payment simulations, consent previews, commitments and pairing remain browser-local', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const ctxA = await browser.newContext({ baseURL: base });
  const ctxB = await browser.newContext({ baseURL: base });
  const parentA = await ctxA.newPage();
  const parentB = await ctxB.newPage();

  try {
    await loginDemo(parentA, 'Parent');
    await parentA.getByRole('button', { name: 'Consent ceiling $23.00' }).click();
    await parentA.getByRole('button', { name: 'Preview 19 students ($32.00)' }).click();
    await expect(parentA.getByText('Renewed consent required for $32.00')).toBeVisible();

    await parentA.getByRole('button', { name: 'My payments & receipts', exact: true }).click();
    await parentA.getByRole('button', { name: 'Simulate payment' }).click();
    await expect(parentA.getByText('Simulated receipt', { exact: true })).toBeVisible();

    await parentA.getByRole('button', { name: 'Community support', exact: true }).click();
    await parentA.getByLabel('My optional contribution (USD cents)').fill('5000');
    await parentA.getByRole('button', { name: 'Commit $50.00 voluntarily' }).click();
    await expect(parentA.getByText('$165.00', { exact: true }).first()).toBeVisible();
    await parentA.getByRole('button', { name: 'Create pairing code' }).click();
    await expect(parentA.getByText('LINK DEMO-PREVIEW', { exact: true })).toBeVisible();

    // Parent B in an isolated context sees only the canonical unpaid/failed seat state.
    await loginDemo(parentB, 'Parent');
    await expect(parentB.getByText('Consent covers $23.00')).toBeVisible();
    await expect(parentB.getByText('$23.00 per student')).toBeVisible();
    await expect(parentB.getByText('Preview updated in this browser.')).toHaveCount(0);

    await parentB.getByRole('button', { name: 'My payments & receipts', exact: true }).click();
    await expect(parentB.getByText('FAILED', { exact: true })).toBeVisible();
    await expect(parentB.getByText('Simulated receipt', { exact: true })).toHaveCount(0);

    await parentB.getByRole('button', { name: 'Community support', exact: true }).click();
    await expect(parentB.getByText('$115.00', { exact: true }).first()).toBeVisible();
    await expect(parentB.getByText('LINK DEMO-PREVIEW')).toHaveCount(0);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

test('C: AG Studio customizations stay isolated per visitor browser without calling server state persistence', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const ctxA = await browser.newContext({ baseURL: base });
  const ctxB = await browser.newContext({ baseURL: base });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const studioStateWrites: string[] = [];
  pageA.on('request', (req) => {
    if (req.method() !== 'GET' && new URL(req.url()).pathname === '/api/studio/state') {
      studioStateWrites.push(req.url());
    }
  });

  try {
    await loginDemo(pageA, 'School admin');
    await pageA.getByRole('link', { name: 'Financial intelligence', exact: true }).click();
    await expect(pageA.getByLabel('Report page')).toBeVisible({ timeout: 45000 });
    await pageA.getByRole('button', { name: 'Replay recorded AI view' }).click();
    await expect(pageA.getByLabel('Report page')).toHaveValue('Recorded AI · Trip comparison');
    await expect(pageA.getByText('Preview updated in this browser.').first()).toBeVisible();
    expect(studioStateWrites).toEqual([]);

    await loginDemo(pageB, 'School admin');
    await pageB.getByRole('link', { name: 'Financial intelligence', exact: true }).click();
    await expect(pageB.getByLabel('Report page')).toBeVisible({ timeout: 45000 });
    await expect(pageB.getByText('Group Unlock', { exact: true }).first()).toBeVisible();
    await expect(pageB.getByLabel('Report page')).toHaveValue('Financial overview');
    await expect(pageB.getByText('Recorded AI · Trip comparison')).toHaveCount(0);
    await expect(pageB.getByText('Preview updated in this browser.')).toHaveCount(0);
    expect(
      await pageB.evaluate(() => sessionStorage.getItem('ce_demo_studio_report_v1')),
    ).toBeNull();
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

test('D: every server-side write route returns 403 DEMO_READ_ONLY (and unsupported methods return 405) in public demo mode', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const adminCtx = await browser.newContext({ baseURL: base });
  const financeCtx = await browser.newContext({ baseURL: base });
  const parentCtx = await browser.newContext({ baseURL: base });
  const adminPage = await adminCtx.newPage();
  const financePage = await financeCtx.newPage();
  const parentPage = await parentCtx.newPage();

  try {
    await loginDemo(adminPage, 'School admin');
    await loginDemo(financePage, 'Finance admin');
    await loginDemo(parentPage, 'Parent');

    const headers = { Origin: base };
    const validTripPayload = {
      name: 'Direct API blocked trip',
      destination: 'Demo Museum',
      description: 'Should be rejected with 403 DEMO_READ_ONLY.',
      date: '2026-12-01',
      deadline: '2026-11-30',
      capacity: 30,
      tiers: [{ min: 1, cents: 2300 }],
    };

    const assertDemoReadOnly = async (page: Page, path: string, data?: Record<string, unknown>) => {
      const res = await page.request.post(path, { headers, data: data ?? {} });
      expect(res.status(), `POST ${path}`).toBe(403);
      expect(await res.json(), `POST ${path} json`).toMatchObject({ code: 'DEMO_READ_ONLY' });
    };

    await assertDemoReadOnly(adminPage, '/api/trips', validTripPayload);
    await assertDemoReadOnly(adminPage, '/api/trips/demo-science', validTripPayload);
    await assertDemoReadOnly(adminPage, '/api/trips/demo-science/freeze');
    await assertDemoReadOnly(adminPage, '/api/trips/demo-science/invite');
    await assertDemoReadOnly(parentPage, '/api/trips/demo-science/register', {
      student: 'Blocked Student',
      consent: true,
      ceilingCents: 3200,
    });
    await assertDemoReadOnly(parentPage, '/api/trips/demo-science/sponsor', { cents: 1000 });
    await assertDemoReadOnly(financePage, '/api/trips/demo-science/simulate-funded');
    await assertDemoReadOnly(adminPage, '/api/trips/demo-science/approve-quote');
    const quoteRes = await adminPage.request.post('/api/trips/demo-science/quotations', {
      headers,
      multipart: {
        file: {
          name: 'quote.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\n'),
        },
      },
    });
    expect(quoteRes.status()).toBe(403);
    expect(await quoteRes.json()).toMatchObject({ code: 'DEMO_READ_ONLY' });

    await assertDemoReadOnly(parentPage, '/api/registration/withdraw', {
      id: 'demo-registration-23',
    });
    await assertDemoReadOnly(parentPage, '/api/registration/consent', {
      id: 'demo-registration-23',
      ceilingCents: 3200,
    });
    await assertDemoReadOnly(parentPage, '/api/assistance/request', {
      registrationId: 'demo-registration-23',
    });
    await assertDemoReadOnly(financePage, '/api/assistance/approve', {
      id: 'assistance-demo-registration-30',
      cents: 2300,
    });
    await assertDemoReadOnly(parentPage, '/api/payments/order', {
      obligationId: 'demo-obligation-23',
    });
    await assertDemoReadOnly(parentPage, '/api/payments/capture', {
      obligationId: 'demo-obligation-23',
    });
    await assertDemoReadOnly(parentPage, '/api/payments/reconcile', {
      operationId: 'demo-payment-23',
    });
    await assertDemoReadOnly(financePage, '/api/payments/refund', {
      captureId: 'demo-capture-1',
    });
    await assertDemoReadOnly(financePage, '/api/finance/contribution', {
      tripId: 'demo-science',
      cents: 1000,
      source: 'Blocked Demo Contribution',
      evidence: 'BLOCKED-DEMO-CONTRIBUTION-01',
    });
    await assertDemoReadOnly(adminPage, '/api/studio/turn', {
      input: [],
      responseFormat: { type: 'text' },
    });
    await assertDemoReadOnly(adminPage, '/api/studio/state', { selectedPageId: 'Tampered' });
    await assertDemoReadOnly(adminPage, '/api/messages/simulate', {
      tripId: 'demo-science',
      text: 'Hello',
      language: 'en',
    });
    await assertDemoReadOnly(parentPage, '/api/messages/connect', {
      tripId: 'demo-science',
      phone: '+15551234567',
    });
    await assertDemoReadOnly(adminPage, '/api/messages/remind', {
      conversationId: 'demo-conversation',
    });
    await assertDemoReadOnly(adminPage, '/api/school', { name: 'Mutated School' });
    await assertDemoReadOnly(adminPage, '/api/schools/create', { name: 'Mutated Second School' });
    await assertDemoReadOnly(adminPage, '/api/schools/switch', { id: 'demo-school' });

    const putRes = await adminPage.request.put('/api/school', {
      headers,
      data: { name: 'PUT Mutation' },
    });
    expect(putRes.status()).toBe(405);
    const deleteRes = await adminPage.request.delete('/api/trips/demo-science', { headers });
    expect(deleteRes.status()).toBe(405);
    expect((await adminPage.request.patch('/api/studio/state', { headers })).status()).toBe(405);
    expect((await adminPage.request.post('/api/me', { headers })).status()).toBe(405);
    expect((await adminPage.request.head('/api/studio/state')).status()).toBe(200);
  } finally {
    await adminCtx.close();
    await financeCtx.close();
    await parentCtx.close();
  }
});

test('E: demo sessions receive 404 on cross-tenant sandbox trips and other-family obligations', async ({
  browser,
}) => {
  const adminCtx = await browser.newContext({ baseURL: base });
  const parentCtx = await browser.newContext({ baseURL: base });
  const adminPage = await adminCtx.newPage();
  const parentPage = await parentCtx.newPage();

  try {
    await loginDemo(adminPage, 'School admin');
    await loginDemo(parentPage, 'Parent');
    const headers = { Origin: base };

    expect((await adminPage.request.get('/api/trips/sandbox-science/registrations')).status()).toBe(
      404,
    );
    expect((await adminPage.request.get('/api/trips/sandbox-science/finance')).status()).toBe(404);
    expect(
      (
        await adminPage.request.post('/api/trips/sandbox-science/freeze', { headers, data: {} })
      ).status(),
    ).toBe(404);
    expect(
      (
        await parentPage.request.post('/api/payments/order', {
          headers,
          data: { obligationId: 'demo-obligation-1' },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await parentPage.request.post('/api/payments/capture', {
          headers,
          data: { obligationId: 'demo-obligation-1' },
        })
      ).status(),
    ).toBe(404);
  } finally {
    await adminCtx.close();
    await parentCtx.close();
  }
});

test('F: restricted sandbox workspace preserves full persistent server workflows', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const adminCtx = await browser.newContext({ baseURL: base });
  const financeCtx = await browser.newContext({ baseURL: base });
  const parentCtx = await browser.newContext({ baseURL: base });
  const adminPage = await adminCtx.newPage();
  const financePage = await financeCtx.newPage();
  const parentPage = await parentCtx.newPage();

  try {
    await loginSandbox(adminPage, 'School admin');
    await loginSandbox(financePage, 'Finance admin');
    const headers = { Origin: base };

    const tripPayload = {
      name: `Sandbox Regression ${Date.now()}`,
      destination: 'Sandbox Discovery Wing',
      description: 'Persistent sandbox workflow verification trip.',
      date: '2026-12-08',
      deadline: '2026-12-02',
      capacity: 25,
      tiers: [{ min: 1, cents: 2000 }],
    };
    const createRes = await adminPage.request.post('/api/trips', {
      headers,
      data: tripPayload,
    });
    expect(createRes.ok()).toBe(true);
    const { id: tripId } = await createRes.json();

    const updateRes = await adminPage.request.post(`/api/trips/${tripId}`, {
      headers,
      data: { ...tripPayload, destination: 'Updated Sandbox Wing' },
    });
    expect(updateRes.ok()).toBe(true);

    const inviteRes = await adminPage.request.post(`/api/trips/${tripId}/invite`, {
      headers,
      data: {},
    });
    expect(inviteRes.ok()).toBe(true);
    const { url } = await inviteRes.json();

    await parentPage.goto(url);
    await parentPage.getByRole('button', { name: 'Open secure parent portal' }).click();
    await expect(parentPage).toHaveURL(/\/parent\?trip=/, { timeout: 30000 });
    await parentPage.getByLabel('Sample student name').fill('Sandbox Isolation Student');
    await parentPage.getByRole('checkbox').check();
    await parentPage.getByRole('button', { name: 'Register & record consent' }).click();
    await expect(parentPage.getByText('Registration and consent recorded.')).toBeVisible();

    await parentPage.getByRole('button', { name: 'Community support', exact: true }).click();
    await parentPage
      .getByRole('button', { name: 'Request support for Sandbox Isolation Student' })
      .click();
    await expect(parentPage.getByText(/private support request was submitted/)).toBeVisible();

    const finInfo = await (await financePage.request.get(`/api/trips/${tripId}/finance`)).json();
    expect(finInfo.allocations).toHaveLength(1);
    const approveRes = await financePage.request.post('/api/assistance/approve', {
      headers,
      data: { id: finInfo.allocations[0].id, cents: 2000 },
    });
    expect(approveRes.ok()).toBe(true);

    const freezeRes = await adminPage.request.post(`/api/trips/${tripId}/freeze`, {
      headers,
      data: {},
    });
    expect(freezeRes.ok()).toBe(true);

    const contribRes = await financePage.request.post('/api/finance/contribution', {
      headers,
      data: {
        tripId,
        cents: 2000,
        source: 'Sandbox Regression Treasury',
        evidence: `SANDBOX-REG-${tripId}`,
      },
    });
    expect(contribRes.ok()).toBe(true);

    const analytics = await (await financePage.request.get('/api/analytics')).json();
    expect(analytics.find((t: { tripId: string }) => t.tripId === tripId)).toMatchObject({
      confirmedSeats: 1,
      fullyAssistedSeats: 1,
      schoolContributionCents: 2000,
      ready: true,
    });
  } finally {
    await adminCtx.close();
    await financeCtx.close();
    await parentCtx.close();
  }
});

test('G: canonical demo financial metrics, single trip, conversation, and audit fingerprint stay exact', async ({
  browser,
}) => {
  const ctx = await browser.newContext({ baseURL: base });
  const page = await ctx.newPage();

  try {
    await loginDemo(page, 'Finance admin');
    const dashboard = await (await page.request.get('/api/dashboard')).json();
    expect(dashboard).toHaveLength(1);
    expect(dashboard[0].trip).toMatchObject({
      id: 'demo-science',
      name: 'A day of discovery',
      state: 'FROZEN',
    });
    expect(dashboard[0].totals).toMatchObject({
      required: 69000,
      gross: 55300,
      fees: 2070,
      refunds: 0,
      net: 53230,
      gap: 15770,
      schoolCents: 0,
      sponsorCommitted: 11500,
      unresolved: 3,
      ready: false,
    });
    expect(dashboard[0].registrationCount).toBe(30);

    const finance = await (await page.request.get('/api/trips/demo-science/finance')).json();
    expect(finance.contributions).toHaveLength(0);
    expect(finance.allocations).toHaveLength(5);

    const messages = await (await page.request.get('/api/messages')).json();
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe('demo-conversation');

    const audit = await (await page.request.get('/api/audit')).json();
    expect(audit).toHaveLength(1);
    expect(audit[0].id).toBe('demo-seed-audit');

    expect(await (await page.request.get('/api/studio/state')).json()).toBeNull();
  } finally {
    await ctx.close();
  }
});

test('H: concurrent independent demo sessions run without cross-contamination or errors', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const ctx1 = await browser.newContext({ baseURL: base });
  const ctx2 = await browser.newContext({ baseURL: base });
  const page1 = await ctx1.newPage();
  const page2 = await ctx2.newPage();
  const errors: string[] = [];
  page1.on('pageerror', (e) => errors.push(e.message));
  page2.on('pageerror', (e) => errors.push(e.message));

  try {
    await Promise.all([loginDemo(page1, 'School admin'), loginDemo(page2, 'Parent')]);

    await Promise.all([
      (async () => {
        await page1.getByRole('button', { name: 'Preview 20 students ($27.00)' }).click();
        await page1.getByRole('link', { name: 'Financial intelligence', exact: true }).click();
        await expect(page1.getByLabel('Report page')).toBeVisible({ timeout: 45000 });
        await page1.getByRole('button', { name: 'Replay recorded AI view' }).click();
      })(),
      (async () => {
        await page2.getByRole('button', { name: 'My payments & receipts', exact: true }).click();
        await page2.getByRole('button', { name: 'Simulate payment' }).click();
        await page2.getByRole('button', { name: 'Ask the trip assistant', exact: true }).click();
        await page2.getByRole('button', { name: 'What is the group price?' }).click();
        await expect(page2.getByText(/group seat price is \$23\.00/).first()).toBeVisible({
          timeout: 30000,
        });
      })(),
    ]);

    const dashCheck = await (await page1.request.get('/api/dashboard')).json();
    expect(dashCheck[0].totals.gap).toBe(15770);
    expect(errors).toEqual([]);
  } finally {
    await ctx1.close();
    await ctx2.close();
  }
});

test('I: same-tab reload preserves local preview, reset restores canonical values, and sign-out clears sessionStorage', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const ctx = await browser.newContext({ baseURL: base });
  const page = await ctx.newPage();

  try {
    await loginDemo(page, 'School admin');
    await page.getByRole('button', { name: 'Preview 19 students ($32.00)' }).click();
    await expect(page.getByText('$32.00 per student').first()).toBeVisible();

    await page.reload();
    await expect(page.getByText('$32.00 per student').first()).toBeVisible();
    await expect(page.getByText('Preview updated in this browser.').first()).toBeVisible();

    await page.getByRole('button', { name: 'Reset demo preview' }).click();
    await expect(page.getByText('$23.00 per student').first()).toBeVisible();

    await page.getByRole('button', { name: 'Preview 20 students ($27.00)' }).click();
    await expect(page.getByText('$27.00 per student').first()).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/');

    const storedAfterLogout = await page.evaluate(() => ({
      w: window.sessionStorage.getItem('ce_demo_workspace_v1'),
      p: window.sessionStorage.getItem('ce_demo_parent_v1'),
      s: window.sessionStorage.getItem('ce_demo_studio_report_v1'),
    }));
    expect(storedAfterLogout).toEqual({ w: null, p: null, s: null });

    await loginDemo(page, 'School admin');
    await expect(page.getByText('$23.00 per student').first()).toBeVisible();
  } finally {
    await ctx.close();
  }
});

test('J: replacing a session or corrupting its preview leaves the canonical workspace usable', async ({
  page,
}) => {
  await loginDemo(page, 'School admin');
  await page.getByRole('button', { name: 'Preview 19 students ($32.00)' }).click();
  await expect(page.getByText('$32.00 per student').first()).toBeVisible();
  const key = 'ce_demo_workspace_v1';
  await page.evaluate((key) => {
    const stored = JSON.parse(sessionStorage.getItem(key)!);
    sessionStorage.setItem(key, JSON.stringify({ ...stored, value: { refunds: 'invalid' } }));
  }, key);
  await page.reload();
  await expect(page.getByText('$23.00 per student').first()).toBeVisible();

  await page.getByRole('button', { name: 'Preview 20 students ($27.00)' }).click();
  await expect(page.getByText('$27.00 per student').first()).toBeVisible();
  const replacement = await page.request.post('/api/auth/login', {
    headers: { Origin: base },
    data: { mode: 'demo', role: 'finance' },
  });
  expect(replacement.ok()).toBe(true);
  await page.reload();
  await expect(page.getByText('$23.00 per student').first()).toBeVisible();
});

test('K: exhausting demo assistant quota in one visitor session does not throttle another independent demo session', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const ctxA = await browser.newContext({ baseURL: base });
  const ctxB = await browser.newContext({ baseURL: base });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    await loginDemo(pageA, 'School admin');
    await loginDemo(pageB, 'School admin');
    const headers = { Origin: base };

    for (let i = 0; i < 60; i++) {
      const ok = await pageA.request.post('/api/assistant', {
        headers,
        data: { tripId: 'demo-science', message: 'What is the group price?', useAI: false },
      });
      expect(ok.status(), `request ${i + 1}`).toBe(200);
    }

    const limited = await pageA.request.post('/api/assistant', {
      headers,
      data: { tripId: 'demo-science', message: 'What is the group price?', useAI: false },
    });
    expect(limited.status()).toBe(429);
    expect(await limited.json()).toMatchObject({ code: 'RATE_LIMIT' });

    // Visitor B logged into the same fixed demo-admin role still gets 200 OK.
    const visitorBAssistant = await pageB.request.post('/api/assistant', {
      headers,
      data: { tripId: 'demo-science', message: 'What is the group price?', useAI: false },
    });
    expect(visitorBAssistant.status()).toBe(200);
    expect((await visitorBAssistant.json()).text).toContain('$23.00');
    expect((await pageB.request.get('/api/dashboard')).status()).toBe(200);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

test('L: demo finance and audit fetches stay strictly bounded across local previews, switching, reload, reset, replacement, and sign-out', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const ctxA = await browser.newContext({ baseURL: base });
  const ctxB = await browser.newContext({ baseURL: base });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const counts = { dashboard: 0, finance: 0, audit: 0, rateLimited: 0 };
  pageA.on('response', (res) => {
    const pathname = new URL(res.url()).pathname;
    if (res.status() === 429) counts.rateLimited += 1;
    if (pathname === '/api/dashboard') counts.dashboard += 1;
    if (/^\/api\/trips\/[^/]+\/finance$/.test(pathname)) counts.finance += 1;
    if (pathname === '/api/audit') counts.audit += 1;
  });

  const snapshot = () => ({ ...counts });
  const settleAndCheckDelta = async (
    label: string,
    before: ReturnType<typeof snapshot>,
    maxDelta: { dashboard: number; finance: number; audit: number },
  ) => {
    await pageA.waitForLoadState('networkidle');
    await pageA.waitForTimeout(1000);
    const after = snapshot();
    expect(after.rateLimited, `${label} 429 count`).toBe(0);
    expect(after.dashboard - before.dashboard, `${label} dashboard delta`).toBeLessThanOrEqual(
      maxDelta.dashboard,
    );
    expect(after.finance - before.finance, `${label} finance delta`).toBeLessThanOrEqual(
      maxDelta.finance,
    );
    expect(after.audit - before.audit, `${label} audit delta`).toBeLessThanOrEqual(maxDelta.audit);
    await expect(pageA.locator('.notice.error')).toHaveCount(0);
  };

  try {
    await loginDemo(pageA, 'Finance admin');
    let mark = snapshot();
    // 1. Initial mount at /finance (without ?trip=) and /finance?trip=demo-science must stay bounded.
    await pageA.goto('/finance');
    await expect(pageA.getByRole('heading', { name: 'Confidential allocations' })).toBeVisible();
    await settleAndCheckDelta('initial /finance mount', mark, {
      dashboard: 1,
      finance: 1,
      audit: 1,
    });

    // 2. Pricing preview from dashboard followed by /finance?trip=demo-science.
    await pageA.goto('/dashboard');
    await expect(pageA.getByRole('button', { name: 'Preview 19 students ($32.00)' })).toBeVisible();
    await pageA.waitForLoadState('networkidle');
    mark = snapshot();
    await pageA.getByRole('button', { name: 'Preview 19 students ($32.00)' }).click();
    await expect(pageA.getByText('$32.00 per student').first()).toBeVisible();
    await settleAndCheckDelta('pricing preview', mark, {
      dashboard: 0,
      finance: 0,
      audit: 0,
    });

    mark = snapshot();
    await pageA.goto('/finance?trip=demo-science');
    await expect(pageA.getByRole('heading', { name: 'Confidential allocations' })).toBeVisible();
    await settleAndCheckDelta('/finance with pricing preview', mark, {
      dashboard: 1,
      finance: 1,
      audit: 1,
    });

    // 3. Funded scenario preview on /finance must trigger 0 extra finance/audit fetches.
    mark = snapshot();
    await pageA.getByRole('button', { name: 'Run funded scenario' }).click();
    await expect(pageA.getByText('0 unresolved operation outcomes')).toBeVisible();
    await settleAndCheckDelta('funded scenario preview', mark, {
      dashboard: 0,
      finance: 0,
      audit: 0,
    });

    // 4. Local contribution preview on /finance must trigger 0 extra finance/audit fetches.
    mark = snapshot();
    await pageA.getByLabel('USD amount', { exact: true }).fill('10.00');
    await pageA.getByLabel('Funding source', { exact: true }).fill('Local regression grant');
    await pageA
      .getByLabel('Authorization / receipt reference', { exact: true })
      .fill('LOCAL-FIN-GRANT-01');
    await pageA.getByRole('button', { name: 'Record authorized contribution' }).click();
    await expect(pageA.getByText('$10.00 · Local regression grant')).toBeVisible();
    await settleAndCheckDelta('contribution preview', mark, {
      dashboard: 0,
      finance: 0,
      audit: 0,
    });

    // 5. Local refund preview on /finance must trigger 0 extra finance/audit fetches.
    mark = snapshot();
    pageA.once('dialog', (dialog) => dialog.accept());
    await pageA.getByRole('button', { name: 'Refund remaining' }).first().click();
    await expect(pageA.getByText(/Simulated refund applied locally/)).toBeVisible();
    await settleAndCheckDelta('refund preview', mark, {
      dashboard: 0,
      finance: 0,
      audit: 0,
    });

    // 6. Reload preserves local preview without extra loops.
    mark = snapshot();
    await pageA.reload();
    await expect(pageA.getByText('$10.00 · Local regression grant')).toBeVisible();
    await expect(pageA.getByText('0 unresolved operation outcomes')).toBeVisible();
    await settleAndCheckDelta('reload with local finance previews', mark, {
      dashboard: 1,
      finance: 1,
      audit: 1,
    });

    // 7. Create a local trip on dashboard and switch trips cleanly.
    await pageA.getByRole('link', { name: 'Overview', exact: true }).click();
    await expect(pageA).toHaveURL(/\/dashboard/);
    await pageA.getByRole('button', { name: 'Create a trip' }).click();
    await pageA.getByLabel('Activity name', { exact: true }).fill('Bounded Switch Trip');
    await pageA.getByLabel('Destination', { exact: true }).fill('Botanical Preview');
    await pageA
      .getByLabel('Approved parent information')
      .fill('Browser-local trip used to verify trip switching.');
    await pageA.getByRole('button', { name: 'Create activity', exact: true }).click();
    await expect(pageA.getByRole('heading', { name: 'Bounded Switch Trip' })).toBeVisible();

    await pageA.goto('/finance?trip=demo-science');
    await expect(pageA.getByLabel('Selected activity')).toBeVisible();
    await pageA.waitForLoadState('networkidle');
    mark = snapshot();
    await pageA.getByLabel('Selected activity').selectOption({ label: 'Bounded Switch Trip' });
    await settleAndCheckDelta('switch to local trip', mark, {
      dashboard: 0,
      finance: 0,
      audit: 0,
    });
    mark = snapshot();
    await pageA.getByLabel('Selected activity').selectOption('demo-science');
    await expect(pageA.getByText('$10.00 · Local regression grant')).toBeVisible();
    await settleAndCheckDelta('switch back to canonical demo-science', mark, {
      dashboard: 0,
      finance: 1,
      audit: 1,
    });

    // 8. Reset demo preview restores canonical metrics without triggering fetches.
    mark = snapshot();
    await pageA.getByRole('button', { name: 'Reset demo preview' }).click();
    await expect(pageA.getByText('3 unresolved operation outcomes')).toBeVisible();
    await expect(pageA.getByText('$157.70', { exact: true }).first()).toBeVisible();
    await settleAndCheckDelta('reset demo preview', mark, {
      dashboard: 0,
      finance: 0,
      audit: 0,
    });

    // 9. Context B still observes canonical Oakwood Academy values in isolation.
    await loginDemo(pageB, 'Finance admin');
    const canonicalDash = await (await pageB.request.get('/api/dashboard')).json();
    expect(canonicalDash).toHaveLength(1);
    expect(canonicalDash[0].totals).toMatchObject({
      required: 69000,
      gross: 55300,
      fees: 2070,
      net: 53230,
      gap: 15770,
      unresolved: 3,
    });
    await pageB.goto('/finance?trip=demo-science');
    await expect(pageB.getByText('$157.70', { exact: true }).first()).toBeVisible();
    await expect(pageB.getByText('Local regression grant')).toHaveCount(0);

    // 10. Session replacement clears stale preview and sign-out clears sessionStorage.
    await pageA.getByRole('button', { name: 'Run funded scenario' }).click();
    await expect(pageA.getByText('0 unresolved operation outcomes')).toBeVisible();
    await pageA.waitForLoadState('networkidle');
    mark = snapshot();
    const replaced = await pageA.request.post('/api/auth/login', {
      headers: { Origin: base },
      data: { mode: 'demo', role: 'admin' },
    });
    expect(replaced.ok()).toBe(true);
    await pageA.goto('/dashboard');
    await expect(pageA.getByText('$157.70 still to go.')).toBeVisible();
    await settleAndCheckDelta('session replacement dashboard', mark, {
      dashboard: 1,
      finance: 0,
      audit: 0,
    });

    mark = snapshot();
    const replacedFinance = await pageA.request.post('/api/auth/login', {
      headers: { Origin: base },
      data: { mode: 'demo', role: 'finance' },
    });
    expect(replacedFinance.ok()).toBe(true);
    await pageA.goto('/finance?trip=demo-science');
    await expect(pageA.getByText('3 unresolved operation outcomes')).toBeVisible();
    await settleAndCheckDelta('session replacement finance', mark, {
      dashboard: 1,
      finance: 1,
      audit: 1,
    });

    await pageA.getByRole('button', { name: 'Sign out' }).click();
    await expect(pageA).toHaveURL('/');
    const cleared = await pageA.evaluate(() => ({
      w: window.sessionStorage.getItem('ce_demo_workspace_v1'),
      p: window.sessionStorage.getItem('ce_demo_parent_v1'),
      s: window.sessionStorage.getItem('ce_demo_studio_report_v1'),
    }));
    expect(cleared).toEqual({ w: null, p: null, s: null });
    expect(counts.rateLimited).toBe(0);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});

test('M: rapid sandbox trip switching prevents stale finance responses from overwriting newer state while preserving explicit refresh', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const ctx = await browser.newContext({ baseURL: base });
  const page = await ctx.newPage();

  try {
    await loginSandbox(page, 'Finance admin');
    const headers = { Origin: base };
    const createTrip = async (name: string) => {
      const res = await page.request.post('/api/trips', {
        headers,
        data: {
          name,
          destination: `${name} Destination`,
          description: 'Synthetic trip to verify stale-response cancellation.',
          date: '2026-12-12',
          deadline: '2026-12-05',
          capacity: 20,
          tiers: [{ min: 1, cents: 2000 }],
        },
      });
      expect(res.ok()).toBe(true);
      return (await res.json()).id as string;
    };

    const tripAlphaId = await createTrip(`Alpha Switch ${Date.now()}`);
    const tripBetaId = await createTrip(`Beta Switch ${Date.now()}`);

    expect(
      (
        await page.request.post('/api/finance/contribution', {
          headers,
          data: {
            tripId: tripAlphaId,
            cents: 1000,
            source: 'Alpha Stale Treasury',
            evidence: `ALPHA-${tripAlphaId}`,
          },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await page.request.post('/api/finance/contribution', {
          headers,
          data: {
            tripId: tripBetaId,
            cents: 2500,
            source: 'Beta Fresh Treasury',
            evidence: `BETA-${tripBetaId}`,
          },
        })
      ).ok(),
    ).toBe(true);

    let releaseAlpha!: () => void;
    const alphaGate = new Promise<void>((resolve) => {
      releaseAlpha = resolve;
    });
    let alphaIntercepted!: () => void;
    const alphaSeen = new Promise<void>((resolve) => {
      alphaIntercepted = resolve;
    });

    await page.route(`**/api/trips/${tripAlphaId}/finance`, async (route) => {
      alphaIntercepted();
      await alphaGate;
      try {
        await route.continue();
      } catch {
        // Request may already be aborted by AbortController on trip switch.
      }
    });

    await page.goto(`/finance?trip=${tripAlphaId}`);
    await alphaSeen;

    await page.getByLabel('Selected activity').selectOption(tripBetaId);
    await expect(page.getByText('$25.00 · Beta Fresh Treasury')).toBeVisible({ timeout: 30000 });

    // Release delayed Trip Alpha response and ensure it never overwrites Trip Beta.
    releaseAlpha();
    await page.waitForTimeout(500);
    await page.unroute(`**/api/trips/${tripAlphaId}/finance`);
    await expect(page.getByText('$25.00 · Beta Fresh Treasury')).toBeVisible();
    await expect(page.getByText('Alpha Stale Treasury')).toHaveCount(0);

    // Switching from loaded Trip Alpha to pending Trip Beta clears Trip Alpha's stale finance view immediately.
    await page.getByLabel('Selected activity').selectOption(tripAlphaId);
    await expect(page.getByText('$10.00 · Alpha Stale Treasury')).toBeVisible({ timeout: 30000 });
    let releaseBeta!: () => void;
    const betaGate = new Promise<void>((resolve) => {
      releaseBeta = resolve;
    });
    let betaSeenResolve!: () => void;
    const betaSeen = new Promise<void>((resolve) => {
      betaSeenResolve = resolve;
    });
    await page.route(`**/api/trips/${tripBetaId}/finance`, async (route) => {
      betaSeenResolve();
      await betaGate;
      try {
        await route.continue();
      } catch {}
    });
    await page.getByLabel('Selected activity').selectOption(tripBetaId);
    await betaSeen;
    await expect(page.getByText('Alpha Stale Treasury')).toHaveCount(0);
    releaseBeta();
    await page.unroute(`**/api/trips/${tripBetaId}/finance`);
    await expect(page.getByText('$25.00 · Beta Fresh Treasury')).toBeVisible({ timeout: 30000 });

    // Explicit operation refresh (`run()`) and manual Refresh button still refresh Sandbox state.
    await page.getByLabel('USD amount', { exact: true }).fill('5.00');
    await page.getByLabel('Funding source', { exact: true }).fill('Beta Followup Grant');
    await page
      .getByLabel('Authorization / receipt reference', { exact: true })
      .fill(`BETA-FOLLOWUP-${tripBetaId}`);
    await page.getByRole('button', { name: 'Record authorized contribution' }).click();
    await expect(page.getByText('Authorized contribution and audit recorded.')).toBeVisible();
    await expect(page.getByText('$5.00 · Beta Followup Grant')).toBeVisible();

    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(page.getByText('Financial records refreshed.')).toBeVisible();

    // Rapid route change cancels in-flight finance fetch cleanly without surfacing an error.
    let releaseRouteAlpha!: () => void;
    const routeAlphaGate = new Promise<void>((resolve) => {
      releaseRouteAlpha = resolve;
    });
    let routeAlphaSeenResolve!: () => void;
    const routeAlphaSeen = new Promise<void>((resolve) => {
      routeAlphaSeenResolve = resolve;
    });
    await page.route(`**/api/trips/${tripAlphaId}/finance`, async (route) => {
      routeAlphaSeenResolve();
      await routeAlphaGate;
      try {
        await route.continue();
      } catch {
        // Request is expected to abort on route transition.
      }
    });
    await page.getByLabel('Selected activity').selectOption(tripAlphaId);
    await routeAlphaSeen;
    await page.getByRole('link', { name: 'Registrations', exact: true }).click();
    await expect(page).toHaveURL(/\/registrations/);
    await expect(page.getByRole('heading', { name: /Ready for discovery/ })).toBeVisible();
    releaseRouteAlpha();
    await page.waitForTimeout(300);
    await page.unroute(`**/api/trips/${tripAlphaId}/finance`);
    await expect(page.locator('.notice.error')).toHaveCount(0);
  } finally {
    await ctx.close();
  }
});

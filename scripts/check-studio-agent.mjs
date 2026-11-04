import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('output/playwright', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
const turns = [];
page.on('response', async (response) => {
  if (response.url().includes('/api/studio/turn')) {
    const body = await response.json();
    turns.push({
      httpStatus: response.status(),
      outputTypes: body.output?.map((item) => item.type),
      tools: body.output?.filter((item) => item.type === 'function_call').map((item) => item.name),
    });
  }
});
try {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('button', { name: 'Enter the demo' }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await page.goto('http://localhost:3000/analytics');
  await page.getByLabel('Report page').selectOption('Trip comparison');
  const prompt = page.getByRole('button', { name: 'Compare trip outcomes', exact: true });
  if (!(await prompt.isVisible()))
    await page
      .getByRole('button', { name: /AI Assistant/ })
      .first()
      .click();
  await prompt.click();
  await page
    .getByRole('button', { name: 'Stop', exact: true })
    .waitFor({ state: 'visible', timeout: 10000 })
    .catch(() => {});
  await page
    .getByRole('button', { name: 'Stop', exact: true })
    .waitFor({ state: 'hidden', timeout: 60000 });
  const selected = await page.getByLabel('Report page').inputValue();
  const chartCount = await page.locator('canvas').count();
  const called = turns.some((t) => t.tools?.includes('build_financial_view'));
  const verified =
    selected === 'AI · Trip funding comparison' &&
    chartCount > 0 &&
    called &&
    turns.every((t) => t.httpStatus === 200);
  await page.screenshot({ path: 'output/playwright/studio-agent.png', fullPage: true });
  const evidence = {
    recordedAt: new Date().toISOString(),
    framework: 'AG Studio 3.1.0 createAiHarness + directLlmRunner',
    provider: 'Gemini account-discovered Flash Lite',
    turns,
    selectedPage: selected,
    nativeChartCanvases: chartCount,
    reportCreationVerified: verified,
    financialStateChanged: false,
    privateAssistanceDataProvided: false,
  };
  await writeFile('docs/studio-agent-evidence.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(evidence);
  if (!verified) process.exitCode = 1;
} finally {
  await browser.close();
}

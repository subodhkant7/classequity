import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Actor } from '../src/server/auth';
import { extractQuote } from '../src/server/integrations/gemini';

const generateContent = vi.hoisted(() => vi.fn());
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));
vi.mock('../src/server/auth', () => ({ quota: vi.fn(), roles: vi.fn() }));
vi.mock('@/db', () => ({ db: { insert: () => ({ values: vi.fn() }) } }));

const demoActor: Actor = {
  schoolId: 'demo-school',
  userId: 'demo-admin',
  name: 'Fictional administrator',
  role: 'admin',
  mode: 'demo',
};
const actor: Actor = {
  schoolId: 'sandbox-school',
  userId: 'sandbox-admin',
  name: 'Sandbox administrator',
  role: 'admin',
  mode: 'sandbox',
};
const model = 'gemini-2.5-flash-lite';
const file = new File(['%PDF-fixture'], 'fictional.pdf', { type: 'application/pdf' });
const quote = {
  currency: 'USD',
  capacity: 40,
  date: '2026-11-20',
  tiers: [{ min: 1, cents: 3200 }],
  discountConditions: [],
  cancellationConditions: [],
  uncertainties: [],
  sourceReferences: ['Issuer header'],
};

beforeAll(() => {
  vi.stubEnv('HOSTED_RESTRICT_PUBLIC_AI', 'false');
  vi.stubEnv('GEMINI_API_KEY', 'fixture-google-key');
  vi.stubEnv('GEMINI_MODEL', model);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        models: [{ name: `models/${model}`, supportedGenerationMethods: ['generateContent'] }],
      }),
    ),
  );
});
afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Gemini quotation issuer validation', () => {
  it('blocks live Gemini quotation extraction in read-only public demo mode', async () => {
    const callsBefore = generateContent.mock.calls.length;
    await expect(extractQuote(demoActor, file)).rejects.toMatchObject({
      status: 403,
      code: 'DEMO_READ_ONLY',
    });
    expect(generateContent).toHaveBeenCalledTimes(callsBefore);
  });

  it.each(['FICTIONAL VENDOR', 'FICTIONAL VENDOR · HACKATHON SAMPLE', ' Unknown ', '  '])(
    'rejects an unresolved issuer (%j)',
    async (vendor) => {
      generateContent.mockResolvedValueOnce({ text: JSON.stringify({ ...quote, vendor }) });
      await expect(extractQuote(actor, file)).rejects.toMatchObject({
        code: 'QUOTE_ISSUER_UNRESOLVED',
      });
    },
  );

  it('preserves a named issuer containing punctuation and returns cents for review', async () => {
    const vendor = 'Fictional Vendor — Museum Services';
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ ...quote, vendor }),
    });
    await expect(extractQuote(actor, file)).resolves.toMatchObject({
      model,
      extraction: {
        vendor,
        currency: 'USD',
        tiers: [{ min: 1, cents: 3200 }],
      },
    });
  });

  it('rejects fractional cents from structured output', async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        ...quote,
        vendor: 'Fictional Science Museum',
        tiers: [{ min: 1, cents: 32.5 }],
      }),
    });
    await expect(extractQuote(actor, file)).rejects.toMatchObject({ status: 502 });
  });
});

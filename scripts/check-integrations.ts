import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
const evidence: Record<string, unknown> = {
  checkedAt: new Date().toISOString(),
  note: 'Read-only credential checks. No buyer approval, payment capture, refund, or outbound message performed.',
};
async function check(name: string, fn: () => Promise<unknown>) {
  try {
    evidence[name] = await fn();
  } catch {
    evidence[name] = {
      status: 'UNVERIFIED',
      reason: 'Credential or network check failed; secrets and raw provider errors omitted.',
    };
  }
}
async function main() {
  await Promise.all([
    check('paypal', async () => {
      const r = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(20000),
      });
      return { oauthStatus: r.status, authenticated: r.ok, financialTransactionsVerified: 0 };
    }),
    check('twilio', async () => {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        },
        signal: AbortSignal.timeout(20000),
      });
      return { accountReadStatus: r.status, authenticated: r.ok, messagesSent: 0 };
    }),
    check('gemini', async () => {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY || '' },
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) return { status: r.status };
      const body = await r.json();
      const models = (body.models as { name: string; supportedGenerationMethods: string[] }[])
        .filter(
          (m) =>
            m.name.includes('flash') && m.supportedGenerationMethods?.includes('generateContent'),
        )
        .map((m) => m.name.replace('models/', ''));
      const preferred =
        models.find((m) => m === process.env.GEMINI_MODEL) ??
        models.find((m) => m === 'gemini-2.5-flash') ??
        models.find((m) => m === 'gemini-2.0-flash') ??
        models[0];
      if (preferred) {
        try {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: { timeout: 20000 },
          });
          const result = await ai.models.generateContent({
            model: preferred,
            contents: 'Reply with the word READY.',
            config: { maxOutputTokens: 128 },
          });
          return {
            status: r.status,
            availableFlashModels: models,
            selectedModel: preferred,
            generationVerified: Boolean(result.text),
          };
        } catch (e) {
          return {
            status: r.status,
            availableFlashModels: models,
            selectedModel: preferred,
            generationVerified: false,
            generationError: e instanceof Error ? e.name : 'provider_error',
          };
        }
      }
      return { status: r.status, availableFlashModels: models };
    }),
  ]);
  await writeFile('docs/integration-evidence.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
}
main();

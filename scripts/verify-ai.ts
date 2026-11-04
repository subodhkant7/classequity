import 'dotenv/config';
import { writeFile, readFile } from 'node:fs/promises';
import { assistant, extractQuote, studioTurn } from '../src/server/integrations/gemini';
import { closeDatabase } from '../src/db';
import type { Actor } from '../src/server/auth';
const admin: Actor = {
  userId: 'demo-admin',
  schoolId: 'demo-school',
  mode: 'demo',
  role: 'admin',
  name: 'Alex Morgan',
};
async function main() {
  const evidence: Record<string, unknown> = { checkedAt: new Date().toISOString() };
  const reply = await assistant(
    { ...admin, role: 'parent', userId: 'demo-parent-23' },
    'demo-science',
    'When is payment due?',
    'hi',
  );
  evidence.parentAssistant = {
    source: reply.source,
    model: reply.model,
    returnedText: !!reply.text,
  };
  try {
    const quote = await readFile('public/sample-vendor-quote.png');
    const result = await extractQuote(
      admin,
      new File([quote], 'sample-vendor-quote.png', { type: 'image/png' }),
    );
    evidence.quotation = {
      model: result.model,
      validated: true,
      tiers: result.extraction.tiers,
      uncertainties: result.extraction.uncertainties,
      administratorReviewRequired: true,
    };
  } catch {
    evidence.quotation = {
      verified: false,
      reason: 'Generation or schema extraction failed; manual pricing remains available.',
    };
  }
  try {
    const r = await studioTurn(admin, {
      input: [
        {
          id: 'verify-financial-question',
          kind: 'input',
          type: 'message',
          role: 'user',
          status: 'completed',
          content: [
            {
              type: 'text',
              text: 'Explain the verified funding gap in one sentence using only the aggregate snapshot.',
            },
          ],
        },
      ],
      responseFormat: { type: 'text' },
    });
    evidence.financialAssistant = {
      model: r.model,
      verified: r.status === 'completed',
      returnedOutput: r.output.length > 0,
    };
  } catch {
    evidence.financialAssistant = { verified: false };
  }
  await writeFile('docs/ai-evidence.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(evidence);
}
main()
  .catch(() => {
    console.error('AI verification incomplete');
    process.exitCode = 1;
  })
  .finally(closeDatabase);

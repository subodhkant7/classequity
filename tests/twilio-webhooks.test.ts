import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import twilio from 'twilio';
import type { Actor } from '../src/server/auth';

const origin = 'http://localhost:3210';
const account = `AC${'1'.repeat(32)}`;
const token = 'fictional-local-signing-secret';
const phone = '+15550100042';
const parent: Actor = {
  schoolId: 'sandbox-school',
  userId: 'sandbox-twilio-fixture-parent',
  name: 'Fictional family',
  role: 'parent',
  mode: 'sandbox',
};
process.env.DATABASE_URL = '';
process.env.LOCAL_DATABASE_DIR = 'memory://';
process.env.APP_URL = origin;
process.env.GEMINI_API_KEY = '';
process.env.TWILIO_ACCOUNT_SID = account;
process.env.TWILIO_AUTH_TOKEN = token;
const { db, closeDatabase } = await import('../src/db');
const s = await import('../src/db/schema');
const { seed } = await import('../scripts/seed');
const { connectPhone } = await import('../src/server/messaging');
const { POST } = await import('../src/app/api/[...path]/route');

beforeAll(async () => {
  for (const file of (await readdir('drizzle')).filter((name) => name.endsWith('.sql')).sort()) {
    for (const part of (await readFile(`drizzle/${file}`, 'utf8')).split(
      '--> statement-breakpoint',
    ))
      if (part.trim()) await db.execute(sql.raw(part));
  }
  await seed();
  await db
    .insert(s.users)
    .values({ id: parent.userId, name: parent.name, email: 'fixture@example.test' });
  await db.insert(s.memberships).values({
    id: parent.userId,
    schoolId: parent.schoolId,
    userId: parent.userId,
    role: parent.role,
  });
}, 30000);
afterAll(closeDatabase);

function fixtureSid(n: number) {
  return `SM${String(n).padStart(32, '0')}`;
}
function webhook(path: string, fields: Record<string, string>, signed = true) {
  const url = `${origin}/api/${path}`;
  const form = { AccountSid: account, ...fields };
  return POST(
    new NextRequest(url, {
      method: 'POST',
      body: new URLSearchParams(form),
      headers: signed
        ? { 'x-twilio-signature': twilio.getExpectedTwilioSignature(token, url, form) }
        : {},
    }),
    { params: Promise.resolve({ path: path.split('/') }) },
  );
}
function inbound(id: number, text: string) {
  return webhook('webhooks/twilio', {
    MessageSid: fixtureSid(id),
    From: `whatsapp:${phone}`,
    Body: text,
  });
}
function statusCallback(id: string, status: string) {
  return webhook('webhooks/twilio/status', { MessageSid: id, MessageStatus: status });
}
async function outboundFixture(n: number, status: string) {
  const { pairingCode } = await connectPhone(parent, 'sandbox-science', phone);
  const id = fixtureSid(n);
  await db.insert(s.messages).values({
    id,
    providerId: id,
    conversationId: pairingCode.slice(5),
    direction: 'OUTBOUND',
    body: 'Fictional message',
    status,
    simulation: false,
  });
  return id;
}
async function storedStatus(id: string) {
  const [message] = await db.select().from(s.messages).where(eq(s.messages.id, id));
  return message.status;
}
async function updateStatus(id: string, status: string) {
  expect((await statusCallback(id, status)).status).toBe(200);
  return storedStatus(id);
}

describe('local Twilio webhook fixtures', () => {
  it('rejects unsigned forms and signed forms for a different account', async () => {
    expect((await webhook('webhooks/twilio', { MessageSid: fixtureSid(1) }, false)).status).toBe(
      401,
    );
    expect(
      (
        await webhook('webhooks/twilio', {
          MessageSid: fixtureSid(2),
          AccountSid: `AC${'2'.repeat(32)}`,
        })
      ).status,
    ).toBe(403);
  });

  it('pairs only on the exact code and stores a single invitation and reply on replay', async () => {
    const { pairingCode } = await connectPhone(parent, 'sandbox-science', phone);
    const id = pairingCode.slice(5);
    expect((await inbound(3, 'LINK incorrect')).status).toBe(200);
    expect(
      (await db.select().from(s.conversations).where(eq(s.conversations.id, id)))[0].optedIn,
    ).toBe(false);
    const response = await inbound(4, pairingCode);
    expect(response.status).toBe(200);
    const text = await response.text();
    const invitationToken = text.match(/\/invite\/([a-f0-9]{64})/)?.[1];
    expect(invitationToken).toBeDefined();
    expect((await inbound(4, pairingCode)).status).toBe(200);
    const invitations = await db
      .select()
      .from(s.invitations)
      .where(eq(s.invitations.userId, parent.userId));
    expect(invitations).toHaveLength(1);
    expect(invitations[0].tokenHash).toBe(
      createHash('sha256').update(invitationToken!).digest('hex'),
    );
    expect(invitations[0].tripId).toBe('sandbox-science');
    expect(invitations[0].expiresAt.getTime() - Date.now()).toBeGreaterThan(0);
    expect(
      await db
        .select()
        .from(s.messages)
        .where(eq(s.messages.id, `${fixtureSid(4)}-reply`)),
    ).toHaveLength(1);
    const [paired] = await db.select().from(s.conversations).where(eq(s.conversations.id, id));
    expect(paired.optedIn).toBe(true);
    expect(paired.lastInboundAt).toBeInstanceOf(Date);
    const english = await (await inbound(5, 'What is the group price?')).text();
    const hindi = await (await inbound(6, 'समूह का मूल्य क्या है?')).text();
    expect(english).toContain('$32.00');
    expect(hindi).toContain('$32.00');
    expect(hindi).toMatch(/\p{Script=Devanagari}/u);
  });

  it('preserves delivery and read evidence when earlier status callbacks arrive late', async () => {
    const id = await outboundFixture(7, 'queued');
    expect(await updateStatus(id, 'sent')).toBe('sent');
    expect(await updateStatus(id, 'failed')).toBe('sent');
    expect(await updateStatus(id, 'delivered')).toBe('delivered');
    expect(await updateStatus(id, 'sent')).toBe('delivered');
    expect(await updateStatus(id, 'undelivered')).toBe('delivered');
    expect(await updateStatus(id, 'read')).toBe('read');
    expect(await updateStatus(id, 'delivered')).toBe('read');
    expect(await updateStatus(id, 'failed')).toBe('read');
    expect(await updateStatus(id, 'undelivered')).toBe('read');
  });

  it('keeps failed sends and undelivered receipts on separate terminal paths', async () => {
    const failed = await outboundFixture(8, 'queued');
    expect(await updateStatus(failed, 'failed')).toBe('failed');
    expect(await updateStatus(failed, 'failed')).toBe('failed');
    expect(await updateStatus(failed, 'undelivered')).toBe('failed');
    expect(await updateStatus(failed, 'delivered')).toBe('failed');

    const undelivered = await outboundFixture(9, 'unknown');
    expect(await updateStatus(undelivered, 'undelivered')).toBe('undelivered');
    expect(await updateStatus(undelivered, 'sent')).toBe('undelivered');
    expect(await updateStatus(undelivered, 'read')).toBe('undelivered');
  });

  it('keeps the read receipt when progress callbacks and duplicates race', async () => {
    const id = await outboundFixture(10, 'queued');
    const responses = await Promise.all(
      ['sent', 'read', 'delivered', 'read'].map((status) => statusCallback(id, status)),
    );
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200]);
    expect(await storedStatus(id)).toBe('read');
  });

  it('rejects malformed identifiers and unrecognized statuses without updating the row', async () => {
    const id = await outboundFixture(11, 'queued');
    expect((await statusCallback('not-a-message-sid', 'delivered')).status).toBe(400);
    expect((await statusCallback(id, 'received')).status).toBe(400);
    expect(await storedStatus(id)).toBe('queued');
  });
});

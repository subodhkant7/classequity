import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { type Actor, hash, roles } from './auth';
import { AppError, requireValue } from './errors';
import { uid, record } from './services';
import { ownTrip } from './data';
import { assistant } from './integrations/gemini';
import { sendWhatsapp } from './integrations/twilio';
import { randomBytes } from 'node:crypto';
import { assertMutableWorkspace } from './demo-policy';
export async function secureLink(a: Actor, tripId: string) {
  await ownTrip(a, tripId);
  assertMutableWorkspace(a);
  const token = randomBytes(32).toString('hex');
  await db
    .insert(s.invitations)
    .values({
      id: uid(),
      tokenHash: hash(token),
      tripId,
      userId: a.userId,
      expiresAt: new Date(Date.now() + 15 * 60000),
    });
  return `${process.env.APP_URL || 'http://localhost:3000'}/invite/${token}`;
}
export async function conversationReply(
  a: Actor,
  tripId: string,
  text: string,
  language: 'en' | 'hi',
  simulation: boolean,
) {
  if (
    /\b(link|register|registration|status|pay|payment|portal)\b|लिंक|भुगतान|पंजीकरण/i.test(text)
  ) {
    const link = await secureLink(a, tripId);
    return {
      text:
        language === 'hi'
          ? `पंजीकरण, सहमति और अपनी भुगतान स्थिति के लिए सुरक्षित लिंक खोलें: ${link} । यह एक बार उपयोग किया जा सकता है और 15 मिनट में समाप्त होगा।`
          : `Open your secure parent portal for registration, consent, and your own payment status: ${link} . This single-use link expires in 15 minutes.`,
      source: simulation ? 'Simulator · secure portal link' : 'WhatsApp · secure portal link',
    };
  }
  return assistant(a, tripId, text, language, !simulation);
}
export async function simulateMessage(
  a: Actor,
  tripId: string,
  text: string,
  language: 'en' | 'hi',
) {
  await ownTrip(a, tripId);
  assertMutableWorkspace(a);
  void text;
  void language;
  throw new AppError('Open browser-local demo mode to use the WhatsApp simulator.', 403);
}
export async function connectPhone(a: Actor, tripId: string, phone: string) {
  await ownTrip(a, tripId);
  assertMutableWorkspace(a);
  roles(a, ['parent']);
  if (!/^\+[1-9]\d{7,14}$/.test(phone))
    throw new AppError('Use an international number such as +15551234567');
  const address = `whatsapp:${phone}`;
  const [existing] = await db
    .select()
    .from(s.conversations)
    .where(and(eq(s.conversations.phone, address), eq(s.conversations.schoolId, a.schoolId)));
  if (existing && existing.userId !== a.userId)
    throw new AppError('This number is already associated with another family.');
  const id = existing?.id ?? uid();
  if (!existing)
    await db
      .insert(s.conversations)
      .values({
        id,
        schoolId: a.schoolId,
        userId: a.userId,
        tripId,
        phone: address,
        optedIn: false,
      });
  return {
    pairingCode: `LINK ${id}`,
    note: 'Join the Twilio sandbox first, then send this exact code from your WhatsApp number to confirm ownership and opt in.',
  };
}
export async function remind(a: Actor, conversationId: string) {
  const [c] = await db
    .select()
    .from(s.conversations)
    .where(and(eq(s.conversations.id, conversationId), eq(s.conversations.schoolId, a.schoolId)));
  requireValue(c);
  assertMutableWorkspace(a);
  roles(a, ['admin', 'finance']);
  if (!c.optedIn || !c.lastInboundAt || Date.now() - c.lastInboundAt.getTime() > 24 * 3600000)
    throw new AppError(
      'A verified opt-in and an open 24-hour customer-service window are required. Outside it, configure an approved template.',
    );
  const t = await ownTrip(a, c.tripId);
  const body = `ClassEquity school reminder: ${t.name} payment deadline is ${t.deadline}. Open your previously issued secure school portal invitation. Please do not send personal or hardship documents here.`;
  const messageId = uid();
  await db
    .insert(s.messages)
    .values({
      id: messageId,
      conversationId,
      direction: 'OUTBOUND',
      body,
      status: 'sending',
      simulation: a.mode === 'demo',
    });
  try {
    if (a.mode === 'demo') {
      await db.update(s.messages).set({ status: 'delivered' }).where(eq(s.messages.id, messageId));
    } else {
      const response = await sendWhatsapp(c.phone, body);
      await db
        .update(s.messages)
        .set({ providerId: response.sid, status: response.status })
        .where(eq(s.messages.id, messageId));
    }
  } catch (e) {
    await db.update(s.messages).set({ status: 'unknown' }).where(eq(s.messages.id, messageId));
    throw e;
  }
  await record(a, a.mode === 'demo' ? 'SIMULATED_REMINDER' : 'WHATSAPP_REMINDER', messageId);
}

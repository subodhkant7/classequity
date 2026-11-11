import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { and, eq, gt, isNull, desc, inArray } from 'drizzle-orm';
import type { AgLlmRequest } from 'ag-studio';
import { db } from '@/db';
import * as s from '@/db/schema';
import {
  actor,
  createSession,
  enforceApiQuota,
  hash,
  logout,
  passwordMatches,
  quota,
  roles,
  sameOrigin,
  type Actor,
} from '@/server/auth';
import { AppError, requireValue } from '@/server/errors';
import {
  assertMutableWorkspace,
  CANONICAL_DEMO_AUDIT_ID,
  CANONICAL_DEMO_CONVERSATION_ID,
  CANONICAL_DEMO_SCHOOL_ID,
  CANONICAL_DEMO_SCHOOL_NAME,
  classifyApiRoute,
  demoReadOnlyError,
} from '@/server/demo-policy';
import {
  aggregateData,
  dashboardData,
  financeData,
  ownTrip,
  parentData,
  safeRegistrations,
} from '@/server/data';
import * as services from '@/server/services';
import { capturePayment, paymentOrder, reconcile, refundPayment } from '@/server/payments';
import { assistant, extractQuote, studioTurn } from '@/server/integrations/gemini';
import {
  secureLink,
  connectPhone,
  conversationReply,
  remind,
  simulateMessage,
} from '@/server/messaging';
import { twiml, verifyTwilio } from '@/server/integrations/twilio';
import { paypalWebhook } from '@/server/paypal-webhooks';
import { quoteSchema } from '@/lib/domain';
import { sql } from 'drizzle-orm';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (value: unknown) =>
  NextResponse.json(value, { headers: { 'Cache-Control': 'no-store' } });
const whatsappStatus = z.enum([
  'accepted',
  'queued',
  'sending',
  'sent',
  'failed',
  'undelivered',
  'delivered',
  'read',
]);
const beforeSent = ['unknown', 'accepted', 'queued', 'sending'];
const beforeDelivery = [...beforeSent, 'sent'];
// Allow skipped callbacks on the same path. Failed sends and failed deliveries
// are separate terminal branches, and a read receipt can follow delivery.
const whatsappStatusPredecessors: Record<z.infer<typeof whatsappStatus>, string[]> = {
  accepted: ['unknown'],
  queued: ['unknown', 'accepted'],
  sending: ['unknown', 'accepted', 'queued'],
  sent: beforeSent,
  failed: beforeSent,
  undelivered: beforeDelivery,
  delivered: beforeDelivery,
  read: [...beforeDelivery, 'delivered'],
};
async function body(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 400000) throw new AppError('Request is too large.', 413);
  return JSON.parse(raw || '{}');
}
function failure(e: unknown) {
  if (e instanceof ZodError)
    return NextResponse.json({ error: e.issues.map((i) => i.message).join('. ') }, { status: 400 });
  if (e instanceof AppError)
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  if (e instanceof SyntaxError)
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  console.error(
    'Request failed:',
    typeof e === 'object' && e && 'code' in e ? String(e.code) : 'INTERNAL_ERROR',
  );
  return NextResponse.json(
    { error: 'Unable to complete this request. Please retry or contact the school.' },
    { status: 500 },
  );
}
async function dispatch(req: NextRequest, path: string[]) {
  const route = path.join('/');
  const classification = classifyApiRoute(req.method, path);
  if (route.startsWith('webhooks/')) return webhook(req, route);
  if (req.method !== 'GET') await sameOrigin();
  if (route === 'health') {
    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      throw new AppError('Service is not ready. Please retry.', 503, 'NOT_READY');
    }
    return json({
      status: 'ok',
      application: 'ClassEquity',
      database: 'ready',
      commit: process.env.RENDER_GIT_COMMIT ?? null,
    });
  }
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (route === 'auth/login' && req.method === 'POST') {
    const v = z
      .object({
        mode: z.enum(['demo', 'sandbox']),
        role: z.enum(['admin', 'finance', 'teacher', 'parent']).default('admin'),
        password: z.string().max(200).optional(),
      })
      .parse(await body(req));
    await quota(`login:${v.mode}:${clientIp}`, v.mode === 'demo' ? 60 : 20);
    if (v.mode === 'demo') await quota('login:demo:global', 600);
    if (v.mode === 'demo' && process.env.DEMO_MODE === 'false')
      throw new AppError('Demo access is disabled', 403);
    if (v.mode === 'sandbox' && !passwordMatches(v.password || ''))
      throw new AppError('The sandbox administrator password was not accepted.', 401);
    if (v.mode === 'sandbox' && v.role === 'parent')
      throw new AppError('Parents must use a secure school invitation.', 403);
    const userId = v.role === 'parent' ? 'demo-parent-23' : `${v.mode}-${v.role}`;
    await createSession(userId, `${v.mode}-school`);
    return json({ redirect: v.role === 'parent' ? '/parent' : '/dashboard' });
  }
  if (route === 'auth/redeem' && req.method === 'POST') {
    const v = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(await body(req));
    const { invitation, trip } = await db.transaction(async (tx) => {
      const [i] = await tx
        .select()
        .from(s.invitations)
        .where(
          and(
            eq(s.invitations.tokenHash, hash(v.token)),
            isNull(s.invitations.usedAt),
            gt(s.invitations.expiresAt, new Date()),
          ),
        )
        .for('update');
      if (!i) throw new AppError('This invitation is expired or already used.', 410);
      const [t] = await tx.select().from(s.trips).where(eq(s.trips.id, i.tripId));
      requireValue(t);
      if (t.schoolId === CANONICAL_DEMO_SCHOOL_ID) throw demoReadOnlyError();
      await tx.update(s.invitations).set({ usedAt: new Date() }).where(eq(s.invitations.id, i.id));
      return { invitation: i, trip: t };
    });
    await createSession(invitation.userId, trip.schoolId);
    return json({ redirect: `/parent?trip=${trip.id}` });
  }
  if (
    req.method === 'GET' &&
    ![
      'me',
      'dashboard',
      'analytics',
      'messages',
      'audit',
      'integrations',
      'export',
      'studio/state',
      'schools',
    ].includes(route) &&
    !(path[0] === 'trips' && ['registrations', 'parent', 'finance', 'quotations'].includes(path[2]))
  )
    throw new AppError('POST required', 405);
  const a = await actor();
  await enforceApiQuota(a, clientIp);
  if (route === 'auth/logout') {
    await logout();
    return json({ redirect: '/' });
  }
  if (route === 'me') return json(a);
  if (route === 'dashboard') return json(await dashboardData(a));
  if (route === 'analytics') return json(await aggregateData(a));
  if (route === 'schools/create') {
    assertMutableWorkspace(a);
    const id = await services.createSchool(
      a,
      z.object({ name: z.string() }).parse(await body(req)).name,
    );
    return json({ id });
  }
  if (route === 'schools') {
    if (a.mode === 'demo')
      return json([
        { id: CANONICAL_DEMO_SCHOOL_ID, name: CANONICAL_DEMO_SCHOOL_NAME, role: a.role },
      ]);
    return json(
      await db
        .select({ id: s.schools.id, name: s.schools.name, role: s.memberships.role })
        .from(s.memberships)
        .innerJoin(s.schools, eq(s.memberships.schoolId, s.schools.id))
        .where(eq(s.memberships.userId, a.userId)),
    );
  }
  if (route === 'schools/switch') {
    assertMutableWorkspace(a);
    const id = z.object({ id: z.string() }).parse(await body(req)).id;
    const [member] = await db
      .select()
      .from(s.memberships)
      .where(and(eq(s.memberships.userId, a.userId), eq(s.memberships.schoolId, id)));
    requireValue(member);
    await createSession(a.userId, id);
    return json({ ok: true });
  }
  if (route === 'school' && req.method === 'POST') {
    assertMutableWorkspace(a);
    await services.updateSchool(a, z.object({ name: z.string() }).parse(await body(req)).name);
    return json({ ok: true });
  }
  if (route === 'trips' && req.method === 'POST') {
    assertMutableWorkspace(a);
    return json({ id: await services.createTrip(a, await body(req)) });
  }
  if (path[0] === 'trips' && path[1]) {
    const id = path[1];
    await ownTrip(a, id);
    if (path.length === 2 && req.method === 'POST') {
      assertMutableWorkspace(a);
      await services.updateTrip(a, id, await body(req));
      return json({ ok: true });
    }
    if (path[2] === 'registrations') return json(await safeRegistrations(a, id));
    if (path[2] === 'parent') return json(await parentData(a, id));
    if (path[2] === 'finance') return json(await financeData(a, id));
    if (path[2] === 'freeze' && req.method === 'POST') {
      assertMutableWorkspace(a);
      await services.freeze(a, id);
      return json({ ok: true });
    }
    if (path[2] === 'invite' && req.method === 'POST') {
      assertMutableWorkspace(a);
      roles(a, ['admin', 'finance']);
      const v = z.object({ registrationId: z.string().optional() }).parse(await body(req));
      if (v.registrationId) {
        const [r] = await db
          .select()
          .from(s.registrations)
          .where(and(eq(s.registrations.id, v.registrationId), eq(s.registrations.tripId, id)));
        requireValue(r);
        return json({ url: await secureLink({ ...a, userId: r.parentId, role: 'parent' }, id) });
      }
      return json({ url: await services.invite(a, id) });
    }
    if (path[2] === 'register' && req.method === 'POST') {
      assertMutableWorkspace(a);
      await services.register(a, id, await body(req));
      return json({ ok: true });
    }
    if (path[2] === 'sponsor' && req.method === 'POST') {
      assertMutableWorkspace(a);
      return json(
        await services.sponsor(a, id, z.object({ cents: z.number() }).parse(await body(req)).cents),
      );
    }
    if (path[2] === 'simulate-funded' && req.method === 'POST') {
      assertMutableWorkspace(a);
      await services.fullyFundedDemo(a, id);
      return json({ ok: true });
    }
    if (path[2] === 'quotations') {
      if (req.method === 'GET') {
        roles(a, ['admin', 'finance']);
        if (a.mode === 'demo') return json([]);
        return json(await db.select().from(s.quotations).where(eq(s.quotations.tripId, id)));
      }
      if (req.method === 'POST') {
        assertMutableWorkspace(a);
        roles(a, ['admin', 'finance']);
        const form = await req.formData();
        const file = form.get('file');
        if (!(file instanceof File)) throw new AppError('Select a quotation to upload.');
        const { extraction, model } = await extractQuote(a, file);
        const quoteId = services.uid();
        await db.insert(s.quotations).values({
          id: quoteId,
          tripId: id,
          filename: file.name.slice(0, 180),
          extraction,
          source: `Gemini ${model}`,
          status: 'REVIEW',
        });
        return json({ id: quoteId, extraction });
      }
    }
    if (path[2] === 'approve-quote' && req.method === 'POST') {
      assertMutableWorkspace(a);
      roles(a, ['admin', 'finance']);
      const v = z
        .object({ id: z.string(), extraction: quoteSchema, reviewed: z.literal(true) })
        .parse(await body(req));
      const [q] = await db
        .select()
        .from(s.quotations)
        .where(and(eq(s.quotations.id, v.id), eq(s.quotations.tripId, id)));
      requireValue(q);
      await db.transaction(async (tx) => {
        const [t] = await tx.select().from(s.trips).where(eq(s.trips.id, id)).for('update');
        if (t.state !== 'OPEN') throw new AppError('Frozen pricing cannot be changed');
        await tx.update(s.trips).set({ tiers: v.extraction.tiers }).where(eq(s.trips.id, id));
        await tx
          .update(s.quotations)
          .set({ extraction: v.extraction, status: 'APPROVED' })
          .where(eq(s.quotations.id, q.id));
      });
      await services.record(a, 'QUOTE_REVIEWED_AND_ACTIVATED', q.id);
      return json({ ok: true });
    }
  }
  if (route === 'registration/withdraw') {
    await services.withdraw(a, z.object({ id: z.string() }).parse(await body(req)).id);
    return json({ ok: true });
  }
  if (route === 'registration/consent') {
    const v = z.object({ id: z.string(), ceilingCents: z.number() }).parse(await body(req));
    await services.consent(a, v.id, v.ceilingCents);
    return json({ ok: true });
  }
  if (route === 'assistance/request') {
    await services.requestAssistance(
      a,
      z.object({ registrationId: z.string() }).parse(await body(req)).registrationId,
    );
    return json({ ok: true });
  }
  if (route === 'assistance/approve') {
    const v = z.object({ id: z.string(), cents: z.number() }).parse(await body(req));
    await services.approveAssistance(a, v.id, v.cents);
    return json({ ok: true });
  }
  if (route === 'payments/order') {
    const v = z.object({ obligationId: z.string() }).parse(await body(req));
    return json(await paymentOrder(a, v.obligationId));
  }
  if (route === 'payments/capture') {
    const v = z.object({ obligationId: z.string() }).parse(await body(req));
    return json(await capturePayment(a, v.obligationId));
  }
  if (route === 'payments/reconcile') {
    return json(
      await reconcile(a, z.object({ operationId: z.string() }).parse(await body(req)).operationId),
    );
  }
  if (route === 'payments/refund') {
    const v = z
      .object({
        captureId: z.string(),
        cents: z.number().int().positive().optional(),
        clientKey: z.string().min(1).max(150).optional(),
      })
      .parse(await body(req));
    if (v.cents && !v.clientKey)
      throw new AppError('Partial refunds require a stable client identity.');
    return json(await refundPayment(a, v.captureId, v.cents, v.clientKey));
  }
  if (route === 'finance/contribution') {
    const v = z
      .object({
        tripId: z.string(),
        cents: z.number().int().positive(),
        source: z.string(),
        evidence: z.string(),
      })
      .parse(await body(req));
    return json(await services.schoolContribution(a, v.tripId, v));
  }
  if (route === 'assistant') {
    const v = z
      .object({
        tripId: z.string(),
        message: z.string().min(1).max(2000),
        language: z.enum(['en', 'hi']).default('en'),
        useAI: z.boolean().default(true),
      })
      .parse(await body(req));
    return json(await assistant(a, v.tripId, v.message, v.language, v.useAI));
  }
  if (route === 'studio/turn') {
    assertMutableWorkspace(a);
    roles(a, ['admin', 'finance', 'teacher']);
    const v = z
      .object({
        input: z.array(z.record(z.string(), z.unknown())).max(100),
        instructions: z.string().max(30000).optional(),
        tools: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
        responseFormat: z.record(z.string(), z.unknown()),
        toolChoice: z.unknown().optional(),
        model: z.unknown().optional(),
      })
      .parse(await body(req));
    return json(await studioTurn(a, v as unknown as AgLlmRequest));
  }
  if (route === 'studio/state') {
    if (req.method === 'GET') {
      roles(a, ['admin', 'finance', 'teacher']);
      if (a.mode === 'demo') return json(null);
      const [d] = await db
        .select()
        .from(s.dashboards)
        .where(and(eq(s.dashboards.schoolId, a.schoolId), eq(s.dashboards.userId, a.userId)));
      return json(d?.state ?? null);
    }
    assertMutableWorkspace(a);
    roles(a, ['admin', 'finance', 'teacher']);
    const state = await body(req);
    await db
      .insert(s.dashboards)
      .values({ id: services.uid(), schoolId: a.schoolId, userId: a.userId, state })
      .onConflictDoUpdate({
        target: [s.dashboards.schoolId, s.dashboards.userId],
        set: { state, updatedAt: new Date() },
      });
    return json({ ok: true });
  }
  if (route === 'messages/simulate') {
    const v = z
      .object({
        tripId: z.string(),
        text: z.string().min(1).max(1000),
        language: z.enum(['en', 'hi']).default('en'),
      })
      .parse(await body(req));
    return json(await simulateMessage(a, v.tripId, v.text, v.language));
  }
  if (route === 'messages/connect') {
    const v = z.object({ tripId: z.string(), phone: z.string() }).parse(await body(req));
    return json(await connectPhone(a, v.tripId, v.phone));
  }
  if (route === 'messages/remind') {
    await remind(a, z.object({ conversationId: z.string() }).parse(await body(req)).conversationId);
    return json({ ok: true });
  }
  if (route === 'messages') {
    roles(a, ['admin', 'finance']);
    const rows = await db
      .select({
        id: s.conversations.id,
        phone: s.conversations.phone,
        optedIn: s.conversations.optedIn,
        lastInboundAt: s.conversations.lastInboundAt,
      })
      .from(s.conversations)
      .where(
        a.mode === 'demo'
          ? and(
              eq(s.conversations.schoolId, a.schoolId),
              eq(s.conversations.id, CANONICAL_DEMO_CONVERSATION_ID),
            )
          : eq(s.conversations.schoolId, a.schoolId),
      );
    return json(rows.map((r) => ({ ...r, phone: r.phone.replace(/\d(?=\d{4})/g, '•') })));
  }
  if (route === 'audit') {
    roles(a, ['finance']);
    return json(
      await db
        .select()
        .from(s.audit)
        .where(
          a.mode === 'demo'
            ? and(eq(s.audit.schoolId, a.schoolId), eq(s.audit.id, CANONICAL_DEMO_AUDIT_ID))
            : eq(s.audit.schoolId, a.schoolId),
        )
        .orderBy(desc(s.audit.createdAt))
        .limit(250),
    );
  }
  if (route === 'integrations') {
    roles(a, ['admin', 'finance']);
    return json({
      mode: a.mode,
      paypal: {
        configured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
        webhook: Boolean(process.env.PAYPAL_WEBHOOK_ID),
        environment: 'Sandbox only',
      },
      twilio: {
        configured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        publicHttps: process.env.APP_URL?.startsWith('https:') ?? false,
      },
      gemini: { configured: Boolean(process.env.GEMINI_API_KEY) },
      studio: { configured: Boolean(process.env.AG_STUDIO_LICENSE_KEY), version: '3.1.0' },
      database: { driver: process.env.DATABASE_URL ? 'PostgreSQL' : 'Local PGlite', durable: true },
    });
  }
  if (route === 'export') {
    roles(a, ['admin', 'finance', 'teacher']);
    const rows = await aggregateData(a);
    const keys = rows.length ? Object.keys(rows[0]) : ['trip'];
    const escape = (v: unknown) =>
      `"${String(v ?? '')
        .replace(/"/g, '""')
        .replace(/^[=+\-@]/, '\u0027$&')}"`;
    const csv = [
      keys.join(','),
      ...rows.map((r) => keys.map((k) => escape(r[k as keyof typeof r])).join(',')),
    ].join('\r\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="classequity-reconciliation.csv"',
        'Cache-Control': 'no-store',
      },
    });
  }
  if (classification === 'invalid_method') {
    throw new AppError('Method not allowed', 405);
  }
  throw new AppError('Endpoint not found', 404);
}
async function webhook(req: NextRequest, route: string) {
  if (req.method !== 'POST') throw new AppError('POST required', 405);
  if (route === 'webhooks/paypal') {
    return json(await paypalWebhook(req));
  }
  if (route === 'webhooks/twilio' || route === 'webhooks/twilio/status') {
    const raw = await req.text();
    if (raw.length > 30000) throw new AppError('Payload too large', 413);
    const params = Object.fromEntries(new URLSearchParams(raw));
    const url = new URL(`/api/${route}`, process.env.APP_URL || 'http://localhost:3000').href;
    if (!verifyTwilio(req.headers.get('x-twilio-signature') || '', url, params))
      throw new AppError('Twilio signature rejected', 401);
    if (params.AccountSid !== process.env.TWILIO_ACCOUNT_SID)
      throw new AppError('Account mismatch', 403);
    if (route.endsWith('/status')) {
      const sid = z
        .string()
        .regex(/^(SM|MM)[a-fA-F0-9]{32}$/)
        .parse(params.MessageSid);
      const status = whatsappStatus.parse(params.MessageStatus);
      await db
        .update(s.messages)
        .set({ status })
        .where(
          and(
            eq(s.messages.providerId, sid),
            eq(s.messages.direction, 'OUTBOUND'),
            eq(s.messages.simulation, false),
            inArray(s.messages.status, whatsappStatusPredecessors[status]),
          ),
        );
      return json({ received: true });
    }
    const sid = z
      .string()
      .regex(/^SM[a-fA-F0-9]{32}$/)
      .parse(params.MessageSid);
    const [cached] = await db
      .select()
      .from(s.messages)
      .where(eq(s.messages.id, `${sid}-reply`));
    if (cached)
      return new NextResponse(twiml(cached.body), { headers: { 'Content-Type': 'text/xml' } });
    const [claim] = await db
      .insert(s.inbox)
      .values({ id: services.uid(), provider: 'twilio', eventId: sid, status: 'PROCESSING' })
      .onConflictDoNothing({ target: [s.inbox.provider, s.inbox.eventId] })
      .returning();
    if (!claim) throw new AppError('Message is being processed', 503);
    try {
      const [c] = await db
        .select()
        .from(s.conversations)
        .innerJoin(s.schools, eq(s.conversations.schoolId, s.schools.id))
        .where(and(eq(s.conversations.phone, params.From), eq(s.schools.mode, 'sandbox')));
      let reply =
        'Welcome to ClassEquity. Ask your school for a secure invitation, join the Twilio sandbox, then link your number from your authenticated parent portal. Please do not send personal or hardship documents.';
      if (c) {
        const conversation = c.ce_whatsapp_conversations;
        const text = (params.Body || '').slice(0, 1000);
        const paired = conversation.optedIn || text.trim() === `LINK ${conversation.id}`;
        if (paired) {
          await db
            .update(s.conversations)
            .set({ optedIn: true, lastInboundAt: new Date() })
            .where(eq(s.conversations.id, conversation.id));
          const [user] = await db.select().from(s.users).where(eq(s.users.id, conversation.userId));
          const a: Actor = {
            userId: user.id,
            name: user.name,
            schoolId: conversation.schoolId,
            role: 'parent',
            mode: 'sandbox',
          };
          await quota(`whatsapp:${conversation.id}`, 25);
          reply = (
            await conversationReply(
              a,
              conversation.tripId,
              text,
              /\p{Script=Devanagari}/u.test(text) ? 'hi' : 'en',
              false,
            )
          ).text;
        } else
          reply =
            'To verify your number, send the LINK code shown in your authenticated ClassEquity parent portal.';
        await db
          .insert(s.messages)
          .values([
            {
              id: sid,
              conversationId: conversation.id,
              providerId: sid,
              direction: 'INBOUND',
              body: text,
              status: 'received',
              simulation: false,
            },
            {
              id: `${sid}-reply`,
              conversationId: conversation.id,
              direction: 'OUTBOUND',
              body: reply,
              status: 'sent',
              simulation: false,
            },
          ])
          .onConflictDoNothing();
      }
      await db.update(s.inbox).set({ status: 'PROCESSED' }).where(eq(s.inbox.id, claim.id));
      return new NextResponse(twiml(reply), { headers: { 'Content-Type': 'text/xml' } });
    } catch (e) {
      await db.delete(s.inbox).where(eq(s.inbox.id, claim.id));
      throw e;
    }
  }
  throw new AppError('Unknown webhook', 404);
}
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    return await dispatch(req, (await params).path);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    return await dispatch(req, (await params).path);
  } catch (e) {
    return failure(e);
  }
}
export { POST as PUT, POST as PATCH, POST as DELETE };

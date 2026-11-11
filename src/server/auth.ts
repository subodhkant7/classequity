import { cookies, headers } from 'next/headers';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { sessions, users, memberships, schools, quotas } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { AppError } from './errors';
import type { Mode, Role } from '@/lib/domain';
export type Actor = { userId: string; schoolId: string; name: string; role: Role; mode: Mode };
const sessionQuotaKeys = new WeakMap<Actor, string>();
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export function bindSessionQuotaKey(a: Actor, sessionKey: string): Actor {
  sessionQuotaKeys.set(a, hash(`session-quota:${sessionKey}`));
  return a;
}
export function sessionQuotaScope(a: Actor): string {
  if (a.mode === 'demo') return sessionQuotaKeys.get(a) ?? a.userId;
  return a.userId;
}
export function demoPreviewScope(a: Actor): string | undefined {
  const sessionKey = sessionQuotaKeys.get(a);
  return a.mode === 'demo' && sessionKey ? hash(`browser-preview:${sessionKey}`) : undefined;
}
export function loginClientKey(h: Headers) {
  const client = process.env.RENDER === 'true' ? h.get('cf-connecting-ip')?.trim() : undefined;
  return client && isIP(client) ? client : 'unattributed';
}
export async function actor(): Promise<Actor> {
  const token = (await cookies()).get('ce_session')?.value;
  if (!token) throw new AppError('Please sign in.', 401, 'UNAUTHENTICATED');
  const sessionId = hash(token);
  const [s] = await db
    .select({
      userId: users.id,
      schoolId: schools.id,
      name: users.name,
      role: memberships.role,
      mode: schools.mode,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(schools, eq(sessions.schoolId, schools.id))
    .innerJoin(
      memberships,
      and(eq(memberships.userId, users.id), eq(memberships.schoolId, schools.id)),
    )
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())));
  if (!s) throw new AppError('Session expired. Please sign in.', 401, 'UNAUTHENTICATED');
  return bindSessionQuotaKey(s, sessionId);
}
export async function optionalActor() {
  try {
    return await actor();
  } catch {
    return null;
  }
}
export function roles(a: Actor, allowed: Role[]) {
  if (!allowed.includes(a.role))
    throw new AppError('This action requires a different school role.', 403, 'FORBIDDEN');
}
export async function createSession(userId: string, schoolId: string) {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw new AppError('Session configuration is incomplete.', 503);
  const token = randomBytes(32).toString('hex');
  await db
    .insert(sessions)
    .values({ id: hash(token), userId, schoolId, expiresAt: new Date(Date.now() + 8 * 3600000) });
  (await cookies()).set('ce_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.APP_URL?.startsWith('https:'),
    path: '/',
    maxAge: 8 * 3600,
  });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get('ce_session')?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hash(token)));
  jar.delete('ce_session');
}
export function passwordMatches(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 16) return false;
  const salt = process.env.SESSION_SECRET || 'classequity';
  return timingSafeEqual(scryptSync(input, salt, 32), scryptSync(expected, salt, 32));
}
export async function sameOrigin() {
  const h = await headers();
  const origin = h.get('origin');
  if (!origin || origin !== new URL(process.env.APP_URL || 'http://localhost:3000').origin)
    throw new AppError('Request origin was rejected.', 403, 'CSRF');
}
export async function quota(key: string, max = 30) {
  const window = new Date().toISOString().slice(0, 13);
  const id = hash(`${key}:${window}`);
  const result = await db
    .insert(quotas)
    .values({ id, count: 1, window })
    .onConflictDoUpdate({ target: quotas.id, set: { count: sql`${quotas.count}+1` } })
    .returning();
  if (result[0].count > max)
    throw new AppError('Request limit reached. Please try again later.', 429, 'RATE_LIMIT');
}
export async function enforceApiQuota(a: Actor) {
  if (a.mode === 'demo') {
    await quota(`api:demo-session:${sessionQuotaScope(a)}`, 240);
    await quota('api:demo-global', 24000);
    return;
  }
  await quota(`api:${a.userId}`, 600);
}

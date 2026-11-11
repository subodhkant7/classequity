import type { Actor } from './auth';
import { AppError } from './errors';

export const DEMO_READ_ONLY_CODE = 'DEMO_READ_ONLY' as const;

export const DEMO_READ_ONLY_MESSAGE =
  'The shared public demo workspace is read-only so every visitor sees a consistent reference dataset. Use the interactive browser preview controls or the restricted sandbox workspace.';

export function demoReadOnlyError(detail = DEMO_READ_ONLY_MESSAGE) {
  return new AppError(detail, 403, DEMO_READ_ONLY_CODE);
}

export function assertMutableWorkspace(a: Actor) {
  if (a.mode === 'demo') throw demoReadOnlyError();
}

export type RouteCategory =
  | 'webhook'
  | 'public_read'
  | 'session_auth'
  | 'reference_read'
  | 'demo_calculation'
  | 'business_mutation'
  | 'invalid_method';

const TOP_LEVEL_GET_ROUTES = new Set([
  'me',
  'dashboard',
  'analytics',
  'messages',
  'audit',
  'integrations',
  'export',
  'studio/state',
  'schools',
]);

const TRIP_GET_SUBROUTES = new Set(['registrations', 'parent', 'finance', 'quotations']);

export function classifyApiRoute(method: string, path: string[]): RouteCategory {
  const route = path.join('/');
  if (route.startsWith('webhooks/')) return 'webhook';
  if (route === 'health') return method === 'GET' ? 'public_read' : 'invalid_method';
  if (route === 'auth/login' || route === 'auth/logout' || route === 'auth/redeem') {
    return method === 'POST' ? 'session_auth' : 'invalid_method';
  }
  if (method === 'GET') {
    if (TOP_LEVEL_GET_ROUTES.has(route)) return 'reference_read';
    if (path[0] === 'trips' && path[1] && path.length === 3 && TRIP_GET_SUBROUTES.has(path[2])) {
      return 'reference_read';
    }
    return 'invalid_method';
  }
  if (method !== 'POST') return 'invalid_method';
  if (route === 'assistant') return 'demo_calculation';
  return 'business_mutation';
}

export const CANONICAL_DEMO_SCHOOL_ID = 'demo-school';
export const CANONICAL_DEMO_SCHOOL_NAME = 'Oakwood Academy';
export const CANONICAL_DEMO_TRIP_ID = 'demo-science';
export const CANONICAL_DEMO_SNAPSHOT_ID = 'demo-snapshot';
export const CANONICAL_DEMO_CONVERSATION_ID = 'demo-conversation';
export const CANONICAL_DEMO_AUDIT_ID = 'demo-seed-audit';

export const CANONICAL_DEMO_TIERS = [
  { min: 1, cents: 3200 },
  { min: 20, cents: 2700 },
  { min: 30, cents: 2300 },
];

export function isCanonicalDemoRegistrationId(id: string): boolean {
  return /^demo-registration-(?:[1-9]|[12]\d|30)$/.test(id);
}

export function isCanonicalDemoConsentId(id: string): boolean {
  return /^consent-demo-registration-(?:[1-9]|[12]\d|30)$/.test(id);
}

export function isCanonicalDemoAllocationId(id: string): boolean {
  return /^assistance-demo-registration-(?:2[6-9]|30)$/.test(id);
}

export function isCanonicalDemoCommitmentId(id: string): boolean {
  return /^demo-sponsor-[1-3]$/.test(id);
}

export function isCanonicalDemoObligationId(id: string): boolean {
  return (
    /^demo-obligation-(?:[1-9]|[12]\d|30)$/.test(id) || /^demo-sponsor-[1-3]-obligation$/.test(id)
  );
}

export function canonicalDemoOperationStatus(id: string): string | null {
  const m = /^demo-payment-(\d+)$/.exec(id);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 21) return 'COMPLETED';
    if (n === 22) return 'PENDING';
    if (n === 23) return 'FAILED';
    if (n === 24) return 'UNKNOWN';
    if (n === 25) return 'CREATED';
    return null;
  }
  if (id === 'demo-sponsor-1-payment' || id === 'demo-sponsor-2-payment') return 'COMPLETED';
  if (id === 'demo-sponsor-3-payment') return 'PENDING';
  return null;
}

export function isCanonicalDemoCaptureId(id: string): boolean {
  return (
    /^demo-capture-(?:[1-9]|1\d|2[01])$/.test(id) || /^demo-sponsor-[12]-capture$/.test(id)
  );
}

export function normalizeCanonicalDemoTrip<
  T extends {
    id: string;
    name: string;
    destination: string;
    description: string;
    date: string;
    deadline: string;
    capacity: number;
    tiers: { min: number; cents: number }[];
    state: string;
  },
>(trip: T): T {
  if (trip.id !== CANONICAL_DEMO_TRIP_ID) return trip;
  return {
    ...trip,
    name: 'A day of discovery',
    destination: 'Exploratorium Science Museum',
    description:
      'An immersive day of science, curiosity, and hands-on learning. Includes museum admission, a guided workshop, and return transport. Bring a packed lunch and a water bottle. Depart school at 8:30 AM; return at 4:00 PM. Sample school activity.',
    date: '2026-11-20',
    deadline: '2026-11-15',
    capacity: 40,
    tiers: CANONICAL_DEMO_TIERS.map((t) => ({ ...t })),
    state: 'FROZEN',
  };
}


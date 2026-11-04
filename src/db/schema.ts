import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { Tier, Role, Mode } from '@/lib/domain';
const id = () => text('id').primaryKey();
const created = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
export const schools = pgTable('ce_schools', {
  id: id(),
  name: text('name').notNull(),
  mode: text('mode').$type<Mode>().notNull(),
  createdAt: created(),
});
export const users = pgTable('ce_users', {
  id: id(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: created(),
});
export const memberships = pgTable(
  'ce_memberships',
  {
    id: id(),
    schoolId: text('school_id')
      .notNull()
      .references(() => schools.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role').$type<Role>().notNull(),
  },
  (t) => [uniqueIndex('ce_membership_unique').on(t.schoolId, t.userId)],
);
export const sessions = pgTable('ce_sessions', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: created(),
});
export const trips = pgTable(
  'ce_trips',
  {
    id: id(),
    schoolId: text('school_id')
      .notNull()
      .references(() => schools.id),
    name: text('name').notNull(),
    destination: text('destination').notNull(),
    description: text('description').notNull(),
    date: text('date').notNull(),
    deadline: text('deadline').notNull(),
    capacity: integer('capacity').notNull(),
    tiers: jsonb('tiers').$type<Tier[]>().notNull(),
    state: text('state').notNull().default('OPEN'),
    reserveCents: integer('reserve_cents').notNull().default(0),
    createdAt: created(),
  },
  (t) => [
    index('ce_trip_tenant').on(t.schoolId),
    check('ce_capacity_positive', sql`${t.capacity}>0`),
  ],
);
export const quotations = pgTable('ce_vendor_quotations', {
  id: id(),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id),
  filename: text('filename').notNull(),
  extraction: jsonb('extraction').notNull(),
  status: text('status').notNull().default('REVIEW'),
  source: text('source').notNull(),
  createdAt: created(),
});
export const registrations = pgTable(
  'ce_registrations',
  {
    id: id(),
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id),
    parentId: text('parent_id')
      .notNull()
      .references(() => users.id),
    student: text('student').notNull(),
    status: text('status').notNull().default('REGISTERED'),
    createdAt: created(),
  },
  (t) => [uniqueIndex('ce_student_once').on(t.tripId, t.student, t.parentId)],
);
export const consents = pgTable('ce_parent_consents', {
  id: id(),
  registrationId: text('registration_id')
    .notNull()
    .references(() => registrations.id),
  ceilingCents: integer('ceiling_cents').notNull(),
  accepted: boolean('accepted').notNull(),
  version: text('version').notNull().default('2026-11-v1'),
  createdAt: created(),
});
export const assistance = pgTable(
  'ce_assistance_allocations',
  {
    id: id(),
    registrationId: text('registration_id')
      .notNull()
      .references(() => registrations.id)
      .unique(),
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id),
    status: text('status').notNull().default('REQUESTED'),
    cents: integer('cents').notNull(),
    approvedBy: text('approved_by').references(() => users.id),
    createdAt: created(),
  },
  (t) => [check('ce_assistance_nonnegative', sql`${t.cents}>=0`)],
);
export const commitments = pgTable(
  'ce_sponsor_commitments',
  {
    id: id(),
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    cents: integer('cents').notNull(),
    status: text('status').notNull().default('COMMITTED'),
    createdAt: created(),
  },
  (t) => [check('ce_commitment_positive', sql`${t.cents}>0`)],
);
export const snapshots = pgTable('ce_pricing_snapshots', {
  id: id(),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id)
    .unique(),
  seatCents: integer('seat_cents').notNull(),
  count: integer('count').notNull(),
  policy: jsonb('policy').$type<Tier[]>().notNull(),
  createdAt: created(),
});
export const obligations = pgTable(
  'ce_financial_obligations',
  {
    id: id(),
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    registrationId: text('registration_id').references(() => registrations.id),
    commitmentId: text('commitment_id').references(() => commitments.id),
    kind: text('kind').notNull(),
    cents: integer('cents').notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex('ce_registration_obligation').on(t.registrationId),
    uniqueIndex('ce_commitment_obligation').on(t.commitmentId),
    check('ce_obligation_nonnegative', sql`${t.cents}>=0`),
  ],
);
export const operations = pgTable('ce_payment_operations', {
  id: id(),
  obligationId: text('obligation_id')
    .notNull()
    .references(() => obligations.id)
    .unique(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id),
  mode: text('mode').$type<Mode>().notNull(),
  requestKey: text('request_key').notNull().unique(),
  orderId: text('order_id').unique(),
  status: text('status').notNull().default('CREATED'),
  approvalUrl: text('approval_url'),
  errorCode: text('error_code'),
  createdAt: created(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const captures = pgTable('ce_paypal_captures', {
  id: id(),
  operationId: text('operation_id')
    .notNull()
    .references(() => operations.id)
    .unique(),
  providerId: text('provider_id').notNull().unique(),
  cents: integer('cents').notNull(),
  feeCents: integer('fee_cents').notNull(),
  refundedCents: integer('refunded_cents').notNull().default(0),
  status: text('status').notNull(),
  createdAt: created(),
});
export const refunds = pgTable('ce_refund_operations', {
  id: id(),
  captureId: text('capture_id')
    .notNull()
    .references(() => captures.id)
    .unique(),
  requestKey: text('request_key').notNull().unique(),
  providerId: text('provider_id').unique(),
  status: text('status').notNull(),
  cents: integer('cents').notNull(),
  authorizedBy: text('authorized_by')
    .notNull()
    .references(() => users.id),
  createdAt: created(),
});
export const invitations = pgTable('ce_invitations', {
  id: id(),
  tokenHash: text('token_hash').notNull().unique(),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: created(),
});
export const conversations = pgTable(
  'ce_whatsapp_conversations',
  {
    id: id(),
    schoolId: text('school_id')
      .notNull()
      .references(() => schools.id),
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    phone: text('phone').notNull(),
    optedIn: boolean('opted_in').notNull().default(false),
    lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [uniqueIndex('ce_phone_once').on(t.phone, t.schoolId)],
);
export const messages = pgTable('ce_message_events', {
  id: id(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id),
  providerId: text('provider_id').unique(),
  direction: text('direction').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull(),
  simulation: boolean('simulation').notNull(),
  createdAt: created(),
});
export const inbox = pgTable(
  'ce_webhook_inbox',
  {
    id: id(),
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    status: text('status').notNull(),
    createdAt: created(),
  },
  (t) => [uniqueIndex('ce_webhook_once').on(t.provider, t.eventId)],
);
export const assessments = pgTable('ce_ai_assessments', {
  id: id(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id),
  kind: text('kind').notNull(),
  model: text('model').notNull(),
  status: text('status').notNull(),
  createdAt: created(),
});
export const audit = pgTable('ce_audit_events', {
  id: id(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityId: text('entity_id').notNull(),
  detail: jsonb('detail').notNull().default({}),
  createdAt: created(),
});
export const dashboards = pgTable(
  'ce_dashboard_configuration',
  {
    id: id(),
    schoolId: text('school_id')
      .notNull()
      .references(() => schools.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    state: jsonb('state').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('ce_dashboard_per_user').on(t.schoolId, t.userId)],
);
export const quotas = pgTable('ce_usage_quotas', {
  id: id(),
  count: integer('count').notNull().default(0),
  window: text('window').notNull(),
});

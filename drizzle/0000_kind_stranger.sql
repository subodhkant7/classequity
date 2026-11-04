CREATE TABLE "ce_ai_assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"kind" text NOT NULL,
	"model" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ce_assistance_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"registration_id" text NOT NULL,
	"trip_id" text NOT NULL,
	"status" text DEFAULT 'REQUESTED' NOT NULL,
	"cents" integer NOT NULL,
	"approved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ce_assistance_allocations_registration_id_unique" UNIQUE("registration_id"),
	CONSTRAINT "ce_assistance_nonnegative" CHECK ("ce_assistance_allocations"."cents">=0)
);
--> statement-breakpoint
CREATE TABLE "ce_audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity_id" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ce_paypal_captures" (
	"id" text PRIMARY KEY NOT NULL,
	"operation_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"cents" integer NOT NULL,
	"fee_cents" integer NOT NULL,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ce_paypal_captures_operation_id_unique" UNIQUE("operation_id"),
	CONSTRAINT "ce_paypal_captures_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "ce_sponsor_commitments" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"user_id" text NOT NULL,
	"cents" integer NOT NULL,
	"status" text DEFAULT 'COMMITTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ce_commitment_positive" CHECK ("ce_sponsor_commitments"."cents">0)
);
--> statement-breakpoint
CREATE TABLE "ce_parent_consents" (
	"id" text PRIMARY KEY NOT NULL,
	"registration_id" text NOT NULL,
	"ceiling_cents" integer NOT NULL,
	"accepted" boolean NOT NULL,
	"version" text DEFAULT '2026-11-v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ce_whatsapp_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"trip_id" text NOT NULL,
	"user_id" text NOT NULL,
	"phone" text NOT NULL,
	"opted_in" boolean DEFAULT false NOT NULL,
	"last_inbound_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ce_dashboard_configuration" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"user_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ce_webhook_inbox" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ce_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"trip_id" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ce_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "ce_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ce_message_events" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"provider_id" text,
	"direction" text NOT NULL,
	"body" text NOT NULL,
	"status" text NOT NULL,
	"simulation" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ce_message_events_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "ce_financial_obligations" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"snapshot_id" text NOT NULL,
	"user_id" text NOT NULL,
	"registration_id" text,
	"commitment_id" text,
	"kind" text NOT NULL,
	"cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ce_obligation_nonnegative" CHECK ("ce_financial_obligations"."cents">=0)
);
--> statement-breakpoint
CREATE TABLE "ce_payment_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"obligation_id" text NOT NULL,
	"school_id" text NOT NULL,
	"mode" text NOT NULL,
	"request_key" text NOT NULL,
	"order_id" text,
	"status" text DEFAULT 'CREATED' NOT NULL,
	"approval_url" text,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ce_payment_operations_obligation_id_unique" UNIQUE("obligation_id"),
	CONSTRAINT "ce_payment_operations_request_key_unique" UNIQUE("request_key"),
	CONSTRAINT "ce_payment_operations_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "ce_usage_quotas" (
	"id" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ce_vendor_quotations" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"filename" text NOT NULL,
	"extraction" jsonb NOT NULL,
	"status" text DEFAULT 'REVIEW' NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ce_refund_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"capture_id" text NOT NULL,
	"request_key" text NOT NULL,
	"provider_id" text,
	"status" text NOT NULL,
	"cents" integer NOT NULL,
	"authorized_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ce_refund_operations_capture_id_unique" UNIQUE("capture_id"),
	CONSTRAINT "ce_refund_operations_request_key_unique" UNIQUE("request_key"),
	CONSTRAINT "ce_refund_operations_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "ce_registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"parent_id" text NOT NULL,
	"student" text NOT NULL,
	"status" text DEFAULT 'REGISTERED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ce_schools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mode" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ce_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"school_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ce_pricing_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"seat_cents" integer NOT NULL,
	"count" integer NOT NULL,
	"policy" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ce_pricing_snapshots_trip_id_unique" UNIQUE("trip_id")
);
--> statement-breakpoint
CREATE TABLE "ce_trips" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"destination" text NOT NULL,
	"description" text NOT NULL,
	"date" text NOT NULL,
	"deadline" text NOT NULL,
	"capacity" integer NOT NULL,
	"tiers" jsonb NOT NULL,
	"state" text DEFAULT 'OPEN' NOT NULL,
	"reserve_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ce_capacity_positive" CHECK ("ce_trips"."capacity">0)
);
--> statement-breakpoint
CREATE TABLE "ce_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ce_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ce_ai_assessments" ADD CONSTRAINT "ce_ai_assessments_school_id_ce_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."ce_schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_assistance_allocations" ADD CONSTRAINT "ce_assistance_allocations_registration_id_ce_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."ce_registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_assistance_allocations" ADD CONSTRAINT "ce_assistance_allocations_trip_id_ce_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."ce_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_assistance_allocations" ADD CONSTRAINT "ce_assistance_allocations_approved_by_ce_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."ce_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_audit_events" ADD CONSTRAINT "ce_audit_events_school_id_ce_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."ce_schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_audit_events" ADD CONSTRAINT "ce_audit_events_user_id_ce_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ce_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_paypal_captures" ADD CONSTRAINT "ce_paypal_captures_operation_id_ce_payment_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."ce_payment_operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_sponsor_commitments" ADD CONSTRAINT "ce_sponsor_commitments_trip_id_ce_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."ce_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_sponsor_commitments" ADD CONSTRAINT "ce_sponsor_commitments_user_id_ce_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ce_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_parent_consents" ADD CONSTRAINT "ce_parent_consents_registration_id_ce_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."ce_registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_whatsapp_conversations" ADD CONSTRAINT "ce_whatsapp_conversations_school_id_ce_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."ce_schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_whatsapp_conversations" ADD CONSTRAINT "ce_whatsapp_conversations_trip_id_ce_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."ce_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_whatsapp_conversations" ADD CONSTRAINT "ce_whatsapp_conversations_user_id_ce_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ce_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_dashboard_configuration" ADD CONSTRAINT "ce_dashboard_configuration_school_id_ce_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."ce_schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_dashboard_configuration" ADD CONSTRAINT "ce_dashboard_configuration_user_id_ce_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ce_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_invitations" ADD CONSTRAINT "ce_invitations_trip_id_ce_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."ce_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_invitations" ADD CONSTRAINT "ce_invitations_user_id_ce_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ce_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_memberships" ADD CONSTRAINT "ce_memberships_school_id_ce_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."ce_schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_memberships" ADD CONSTRAINT "ce_memberships_user_id_ce_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ce_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_message_events" ADD CONSTRAINT "ce_message_events_conversation_id_ce_whatsapp_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ce_whatsapp_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_financial_obligations" ADD CONSTRAINT "ce_financial_obligations_trip_id_ce_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."ce_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_financial_obligations" ADD CONSTRAINT "ce_financial_obligations_snapshot_id_ce_pricing_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."ce_pricing_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_financial_obligations" ADD CONSTRAINT "ce_financial_obligations_user_id_ce_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ce_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_financial_obligations" ADD CONSTRAINT "ce_financial_obligations_registration_id_ce_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."ce_registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_financial_obligations" ADD CONSTRAINT "ce_financial_obligations_commitment_id_ce_sponsor_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."ce_sponsor_commitments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_payment_operations" ADD CONSTRAINT "ce_payment_operations_obligation_id_ce_financial_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."ce_financial_obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_payment_operations" ADD CONSTRAINT "ce_payment_operations_school_id_ce_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."ce_schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_vendor_quotations" ADD CONSTRAINT "ce_vendor_quotations_trip_id_ce_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."ce_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_refund_operations" ADD CONSTRAINT "ce_refund_operations_capture_id_ce_paypal_captures_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."ce_paypal_captures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_refund_operations" ADD CONSTRAINT "ce_refund_operations_authorized_by_ce_users_id_fk" FOREIGN KEY ("authorized_by") REFERENCES "public"."ce_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_registrations" ADD CONSTRAINT "ce_registrations_trip_id_ce_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."ce_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_registrations" ADD CONSTRAINT "ce_registrations_parent_id_ce_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ce_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_sessions" ADD CONSTRAINT "ce_sessions_user_id_ce_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ce_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_sessions" ADD CONSTRAINT "ce_sessions_school_id_ce_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."ce_schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_pricing_snapshots" ADD CONSTRAINT "ce_pricing_snapshots_trip_id_ce_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."ce_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_trips" ADD CONSTRAINT "ce_trips_school_id_ce_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."ce_schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ce_phone_once" ON "ce_whatsapp_conversations" USING btree ("phone","school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ce_dashboard_per_user" ON "ce_dashboard_configuration" USING btree ("school_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ce_webhook_once" ON "ce_webhook_inbox" USING btree ("provider","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ce_membership_unique" ON "ce_memberships" USING btree ("school_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ce_registration_obligation" ON "ce_financial_obligations" USING btree ("registration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ce_commitment_obligation" ON "ce_financial_obligations" USING btree ("commitment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ce_student_once" ON "ce_registrations" USING btree ("trip_id","student","parent_id");--> statement-breakpoint
CREATE INDEX "ce_trip_tenant" ON "ce_trips" USING btree ("school_id");
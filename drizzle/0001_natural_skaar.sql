CREATE TABLE "ce_school_contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"mode" text NOT NULL,
	"cents" integer NOT NULL,
	"source" text NOT NULL,
	"evidence" text NOT NULL,
	"authorized_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ce_contribution_positive" CHECK ("ce_school_contributions"."cents">0)
);
--> statement-breakpoint
ALTER TABLE "ce_refund_operations" DROP CONSTRAINT "ce_refund_operations_capture_id_unique";--> statement-breakpoint
ALTER TABLE "ce_paypal_captures" ADD COLUMN "fee_known" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ce_paypal_captures" ADD COLUMN "provenance" text DEFAULT 'UNVERIFIED' NOT NULL;--> statement-breakpoint
ALTER TABLE "ce_paypal_captures" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ce_paypal_captures" ADD COLUMN "provider_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ce_webhook_inbox" ADD COLUMN "body_hash" text;--> statement-breakpoint
ALTER TABLE "ce_webhook_inbox" ADD COLUMN "lease_token" text;--> statement-breakpoint
ALTER TABLE "ce_webhook_inbox" ADD COLUMN "lease_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ce_webhook_inbox" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ce_webhook_inbox" ADD COLUMN "error_code" text;--> statement-breakpoint
ALTER TABLE "ce_payment_operations" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ce_payment_operations" ADD COLUMN "capture_key" text;--> statement-breakpoint
ALTER TABLE "ce_payment_operations" ADD COLUMN "capture_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ce_refund_operations" ADD COLUMN "client_key" text;--> statement-breakpoint
ALTER TABLE "ce_school_contributions" ADD CONSTRAINT "ce_school_contributions_trip_id_ce_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."ce_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_school_contributions" ADD CONSTRAINT "ce_school_contributions_authorized_by_ce_users_id_fk" FOREIGN KEY ("authorized_by") REFERENCES "public"."ce_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ce_refund_operations" ADD CONSTRAINT "ce_refund_operations_client_key_unique" UNIQUE("client_key");
--> statement-breakpoint
UPDATE ce_refund_operations SET client_key = 'legacy-' || id WHERE client_key IS NULL;
--> statement-breakpoint
ALTER TABLE ce_refund_operations ALTER COLUMN client_key SET NOT NULL;
--> statement-breakpoint
UPDATE ce_paypal_captures c SET provenance='SYNTHETIC', fee_known=true FROM ce_payment_operations o WHERE c.operation_id=o.id AND o.mode='demo';
--> statement-breakpoint
UPDATE ce_payment_operations SET capture_requested_at=updated_at, capture_key=request_key || '-capture' WHERE mode='sandbox' AND status IN ('CAPTURING','COMPLETED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED','REVERSED','UNKNOWN');

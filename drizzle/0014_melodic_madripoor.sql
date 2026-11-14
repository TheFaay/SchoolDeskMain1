CREATE TYPE "public"."application_fee_status" AS ENUM('unpaid', 'pending', 'paid');--> statement-breakpoint
CREATE TABLE "application_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"authorization_url" text,
	"raw_event" jsonb,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_payments_reference_unique" UNIQUE("reference"),
	CONSTRAINT "application_payments_amount_positive_check" CHECK ("application_payments"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "fee_status" "application_fee_status" DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "fee_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "fee_paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "application_payments" ADD CONSTRAINT "application_payments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_payments_application_created_idx" ON "application_payments" USING btree ("application_id","created_at");
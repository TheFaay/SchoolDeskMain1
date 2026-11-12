CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'test';--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "category" text DEFAULT 'Fees';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "session" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "term" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "receipt_number" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "balance_after" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "status" "payment_status" DEFAULT 'success' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_receipt_number_unique" UNIQUE("receipt_number");
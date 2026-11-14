ALTER TABLE "application_documents" ADD COLUMN "file_name" text;
--> statement-breakpoint
ALTER TABLE "application_documents" ADD COLUMN "mime_type" text;
--> statement-breakpoint
ALTER TABLE "application_documents" ADD COLUMN "data" "bytea";
--> statement-breakpoint
UPDATE "application_documents" SET "file_name" = 'legacy-document', "mime_type" = 'application/octet-stream', "data" = decode('', 'hex') WHERE "file_name" IS NULL;
--> statement-breakpoint
ALTER TABLE "application_documents" ALTER COLUMN "file_name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "application_documents" ALTER COLUMN "mime_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "application_documents" ALTER COLUMN "data" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "staff_notes" text DEFAULT '' NOT NULL;

CREATE TYPE "public"."fee_reminder_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "fee_reminder_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_user_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"reminder_date" date NOT NULL,
	"status" "fee_reminder_status" DEFAULT 'pending' NOT NULL,
	"sent_by" text NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fee_reminder_logs" ADD CONSTRAINT "fee_reminder_logs_parent_user_id_user_id_fk" FOREIGN KEY ("parent_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_reminder_logs" ADD CONSTRAINT "fee_reminder_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_reminder_logs" ADD CONSTRAINT "fee_reminder_logs_sent_by_user_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fee_reminder_logs_recipient_student_date_idx" ON "fee_reminder_logs" USING btree ("parent_user_id","student_id","reminder_date");--> statement-breakpoint
CREATE INDEX "fee_reminder_logs_status_idx" ON "fee_reminder_logs" USING btree ("status");
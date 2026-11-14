CREATE TYPE "public"."email_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"status" "email_status" NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notice_recipients" (
	"notice_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "notice_recipients_notice_id_user_id_pk" PRIMARY KEY("notice_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "notice_recipients" ADD CONSTRAINT "notice_recipients_notice_id_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_recipients" ADD CONSTRAINT "notice_recipients_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_logs_status_created_idx" ON "email_logs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "notice_recipients_user_idx" ON "notice_recipients" USING btree ("user_id");
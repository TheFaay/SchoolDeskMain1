CREATE TYPE "public"."application_document_type" AS ENUM('birth_certificate', 'last_school_report', 'passport_photograph', 'other');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('submitted', 'under_review', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."notice_audience" AS ENUM('all_parents', 'class', 'individual');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('active', 'graduated', 'withdrawn');--> statement-breakpoint
CREATE TABLE "academic_sessions" (
	"name" text PRIMARY KEY NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	CONSTRAINT "academic_sessions_date_order_check" CHECK ("academic_sessions"."starts_on" < "academic_sessions"."ends_on"),
	CONSTRAINT "academic_sessions_name_format_check" CHECK ("academic_sessions"."name" ~ '^[0-9]{4}/[0-9]{4}$')
);
--> statement-breakpoint
CREATE TABLE "academic_terms" (
	"session" text NOT NULL,
	"term" "score_term" NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"days_school_was_open" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "academic_terms_session_term_pk" PRIMARY KEY("session","term"),
	CONSTRAINT "academic_terms_date_order_check" CHECK ("academic_terms"."starts_on" < "academic_terms"."ends_on"),
	CONSTRAINT "academic_terms_days_open_check" CHECK ("academic_terms"."days_school_was_open" >= 0)
);
--> statement-breakpoint
CREATE TABLE "application_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"type" "application_document_type" NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_documents_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "application_documents_size_positive_check" CHECK ("application_documents"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" text NOT NULL,
	"child_full_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" text NOT NULL,
	"class_applying_for" text NOT NULL,
	"parent_full_name" text NOT NULL,
	"parent_phone_number" text NOT NULL,
	"parent_email" text NOT NULL,
	"status" "application_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"audience" "notice_audience" DEFAULT 'all_parents' NOT NULL,
	"class_id" uuid,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_date_order_check" CHECK ("events"."ends_at" is null or "events"."starts_at" < "events"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "notice_reads" (
	"notice_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notice_reads_notice_id_user_id_pk" PRIMARY KEY("notice_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" "notice_audience" NOT NULL,
	"class_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notices_class_audience_check" CHECK (("notices"."audience" = 'class' and "notices"."class_id" is not null) or ("notices"."audience" <> 'class' and "notices"."class_id" is null))
);
--> statement-breakpoint
CREATE TABLE "school_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"current_session" text NOT NULL,
	"current_term" "score_term" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_settings_singleton_check" CHECK ("school_settings"."id" = 1)
);
--> statement-breakpoint
DROP INDEX "results_published_class_term_idx";--> statement-breakpoint
DROP INDEX "scores_student_subject_term_idx";--> statement-breakpoint
DROP INDEX "scores_class_term_idx";--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "session" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "term" SET DATA TYPE "public"."score_term" USING "term"::"public"."score_term";--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "term" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "paystack_reference" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "raw_event" jsonb;--> statement-breakpoint
ALTER TABLE "results_published" ADD COLUMN "session" text NOT NULL;--> statement-breakpoint
ALTER TABLE "results_published" ADD COLUMN "published_by" text;--> statement-breakpoint
ALTER TABLE "results_published" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "scores" ADD COLUMN "session" text NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "status" "student_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_session_academic_sessions_name_fk" FOREIGN KEY ("session") REFERENCES "public"."academic_sessions"("name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_reads" ADD CONSTRAINT "notice_reads_notice_id_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_reads" ADD CONSTRAINT "notice_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_settings" ADD CONSTRAINT "school_settings_current_session_academic_sessions_name_fk" FOREIGN KEY ("current_session") REFERENCES "public"."academic_sessions"("name") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_settings" ADD CONSTRAINT "school_settings_current_session_current_term_academic_terms_session_term_fk" FOREIGN KEY ("current_session","current_term") REFERENCES "public"."academic_terms"("session","term") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_documents_application_idx" ON "application_documents" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "applications_status_created_idx" ON "applications" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "notices_created_at_idx" ON "notices" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_marked_by_user_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_session_academic_sessions_name_fk" FOREIGN KEY ("session") REFERENCES "public"."academic_sessions"("name") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_parent_user_id_user_id_fk" FOREIGN KEY ("parent_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results_published" ADD CONSTRAINT "results_published_session_academic_sessions_name_fk" FOREIGN KEY ("session") REFERENCES "public"."academic_sessions"("name") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results_published" ADD CONSTRAINT "results_published_published_by_user_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results_published" ADD CONSTRAINT "results_published_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_session_academic_sessions_name_fk" FOREIGN KEY ("session") REFERENCES "public"."academic_sessions"("name") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_entered_by_user_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_teacher_user_id_user_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "results_published_class_session_term_idx" ON "results_published" USING btree ("class_id","session","term");--> statement-breakpoint
CREATE INDEX "results_published_published_by_idx" ON "results_published" USING btree ("published_by");--> statement-breakpoint
CREATE UNIQUE INDEX "scores_student_subject_session_term_idx" ON "scores" USING btree ("student_id","subject_id","session","term");--> statement-breakpoint
CREATE INDEX "scores_class_session_term_idx" ON "scores" USING btree ("class_id","session","term");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_paystack_reference_unique" UNIQUE("paystack_reference");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive_check" CHECK ("payments"."amount" > 0);--> statement-breakpoint
ALTER TABLE "results_published" ADD CONSTRAINT "results_published_metadata_check" CHECK (not "results_published"."published" or ("results_published"."published_by" is not null and "results_published"."published_at" is not null));--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_ca_range_check" CHECK ("scores"."ca_score" >= 0 and "scores"."ca_score" <= 40);--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_exam_range_check" CHECK ("scores"."exam_score" >= 0 and "scores"."exam_score" <= 60);
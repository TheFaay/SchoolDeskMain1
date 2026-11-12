CREATE TYPE "public"."score_term" AS ENUM('first', 'second', 'third');--> statement-breakpoint
CREATE TABLE "results_published" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"term" "score_term" NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"term" "score_term" NOT NULL,
	"ca_score" numeric(5, 2) NOT NULL,
	"exam_score" numeric(5, 2) NOT NULL,
	"total" numeric(5, 2) NOT NULL,
	"grade" text NOT NULL,
	"entered_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "teacher_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_user_id" text NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "results_published_class_term_idx" ON "results_published" USING btree ("class_id","term");--> statement-breakpoint
CREATE UNIQUE INDEX "scores_student_subject_term_idx" ON "scores" USING btree ("student_id","subject_id","term");--> statement-breakpoint
CREATE INDEX "scores_class_term_idx" ON "scores" USING btree ("class_id","term");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_assignments_unique_idx" ON "teacher_assignments" USING btree ("teacher_user_id","class_id","subject_id");--> statement-breakpoint
CREATE INDEX "teacher_assignments_class_id_idx" ON "teacher_assignments" USING btree ("class_id");
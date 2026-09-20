CREATE TYPE "public"."block_format" AS ENUM('review', 'technical', 'quarter_kata', 'emom', 'beginning_blast', 'burpee_endings', 'leg_day', 'upper_body', 'circuit', 'vest_contrast', 'other');--> statement-breakpoint
CREATE TYPE "public"."learning_author" AS ENUM('coach', 'ai');--> statement-breakpoint
CREATE TYPE "public"."learning_source" AS ENUM('session', 'competition', 'scoring_card', 'feedback', 'manual');--> statement-breakpoint
CREATE TYPE "public"."split" AS ENUM('full', 'half', 'third', 'quarter');--> statement-breakpoint
CREATE TABLE "athlete_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"minutes" smallint NOT NULL,
	"label" text NOT NULL,
	"coach_led" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kata_section_timings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid,
	"kata_id" uuid NOT NULL,
	"split" "split" NOT NULL,
	"section_index" smallint NOT NULL,
	"seconds" smallint NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kata_section_timings_uq" UNIQUE NULLS NOT DISTINCT("athlete_id","kata_id","split","section_index")
);
--> statement-breakpoint
CREATE TABLE "learnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid,
	"body" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"source" "learning_source" DEFAULT 'manual' NOT NULL,
	"source_id" uuid,
	"author" "learning_author" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"part" smallint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"kata_id" uuid,
	"label" text,
	"split" "split",
	"sections" smallint[],
	"reps" smallint,
	"rest_rep_sec" smallint,
	"rest_section_sec" smallint,
	"rounds" smallint DEFAULT 1 NOT NULL,
	"format" "block_format" DEFAULT 'technical' NOT NULL,
	"vest" boolean DEFAULT false NOT NULL,
	"minutes" smallint,
	"skipped" boolean DEFAULT false NOT NULL,
	"actual_reps" smallint,
	"notes" text,
	"coach_notes" text
);
--> statement-breakpoint
CREATE TABLE "training_plan_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"target_load" smallint NOT NULL,
	"target_intensity" real NOT NULL,
	"character" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"target_competition_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"plan_id" uuid,
	"date" date NOT NULL,
	"title" text,
	"notes" text,
	"coach_notes" text,
	"skipped_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athlete_availability" ADD CONSTRAINT "athlete_availability_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kata_section_timings" ADD CONSTRAINT "kata_section_timings_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kata_section_timings" ADD CONSTRAINT "kata_section_timings_kata_id_kata_id_fk" FOREIGN KEY ("kata_id") REFERENCES "public"."kata"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learnings" ADD CONSTRAINT "learnings_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_blocks" ADD CONSTRAINT "training_blocks_session_id_training_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_blocks" ADD CONSTRAINT "training_blocks_kata_id_kata_id_fk" FOREIGN KEY ("kata_id") REFERENCES "public"."kata"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plan_weeks" ADD CONSTRAINT "training_plan_weeks_plan_id_training_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_target_competition_id_competitions_id_fk" FOREIGN KEY ("target_competition_id") REFERENCES "public"."competitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_plan_id_training_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "athlete_availability_athlete_idx" ON "athlete_availability" USING btree ("athlete_id","weekday");--> statement-breakpoint
CREATE INDEX "learnings_athlete_idx" ON "learnings" USING btree ("athlete_id","created_at");--> statement-breakpoint
CREATE INDEX "training_blocks_session_idx" ON "training_blocks" USING btree ("session_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "training_plan_weeks_plan_week_uq" ON "training_plan_weeks" USING btree ("plan_id","week_start");--> statement-breakpoint
CREATE INDEX "training_plans_athlete_idx" ON "training_plans" USING btree ("athlete_id","start_date");--> statement-breakpoint
CREATE INDEX "training_sessions_athlete_date_idx" ON "training_sessions" USING btree ("athlete_id","date");
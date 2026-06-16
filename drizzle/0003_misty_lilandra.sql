CREATE TABLE "feedback_kata_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_id" uuid NOT NULL,
	"kata_id" uuid NOT NULL,
	"score" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Hand-edited: drizzle-kit cannot detect an enum value *rename*, so it emitted a
-- drop/recreate that would fail casting existing 'U16' rows. Rename in place + add
-- the two new values instead (preserves data; no separate UPDATE needed).
ALTER TYPE "public"."form_type" RENAME VALUE 'U16' TO 'CADET';--> statement-breakpoint
ALTER TYPE "public"."form_type" ADD VALUE 'JUNIOR';--> statement-breakpoint
ALTER TYPE "public"."form_type" ADD VALUE 'SENIOR';--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "self_rating_training_quality" integer;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "self_rating_recovery" integer;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "self_rating_mental" integer;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "training_quality_reflection" text;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "competition_reflection" text;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "mental_preparation" text;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "mental_preparation_review" text;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "training_period_reflection" text;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "physical_state_notes" text;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "athlete_discussion_points" text;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "training_structure_feedback" text;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "previous_goals_review" text;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "periodization_notes" text;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "physical_plan" text;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "action_4" text;--> statement-breakpoint
ALTER TABLE "feedback_kata_ratings" ADD CONSTRAINT "feedback_kata_ratings_feedback_id_feedback_forms_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_kata_ratings" ADD CONSTRAINT "feedback_kata_ratings_kata_id_kata_id_fk" FOREIGN KEY ("kata_id") REFERENCES "public"."kata"("id") ON DELETE cascade ON UPDATE no action;
CREATE TYPE "public"."feedback_status" AS ENUM('awaiting_athlete', 'athlete_submitted', 'completed');--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "status" "feedback_status" DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "prepare_token" text;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "athlete_opened_at" timestamp;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "athlete_submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
CREATE INDEX "feedback_athlete_status_idx" ON "feedback_forms" USING btree ("athlete_id","status");--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD CONSTRAINT "feedback_forms_prepare_token_unique" UNIQUE("prepare_token");
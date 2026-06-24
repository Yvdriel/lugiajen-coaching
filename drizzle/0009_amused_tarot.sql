CREATE TABLE "competition_athlete_reflection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"reflected_at_meeting_id" uuid,
	"overall_rating" smallint,
	"reflection_before" text,
	"reflection_performance" text,
	"reflection_improvement" text,
	"reflection_lesson" text,
	"reflection_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competition_athlete_reflection" ADD CONSTRAINT "competition_athlete_reflection_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_athlete_reflection" ADD CONSTRAINT "competition_athlete_reflection_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_athlete_reflection" ADD CONSTRAINT "competition_athlete_reflection_reflected_at_meeting_id_feedback_forms_id_fk" FOREIGN KEY ("reflected_at_meeting_id") REFERENCES "public"."feedback_forms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competition_athlete_reflection_comp_athlete_idx" ON "competition_athlete_reflection" USING btree ("competition_id","athlete_id");
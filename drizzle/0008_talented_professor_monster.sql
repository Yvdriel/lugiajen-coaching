CREATE TYPE "public"."action_coach_disposition" AS ENUM('pending', 'done', 'partly', 'not_done');--> statement-breakpoint
CREATE TYPE "public"."disposition" AS ENUM('done', 'partly', 'not_done');--> statement-breakpoint
CREATE TYPE "public"."goal_category" AS ENUM('main', 'performance', 'outcome', 'kata_focus');--> statement-breakpoint
CREATE TYPE "public"."goal_momentum" AS ENUM('progressing', 'stalled');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'achieved', 'carried', 'dropped');--> statement-breakpoint
CREATE TABLE "feedback_action_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_id" uuid NOT NULL,
	"text" text NOT NULL,
	"kata_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"coach_disposition" "action_coach_disposition" DEFAULT 'pending' NOT NULL,
	"coach_note" text,
	"athlete_disposition" "disposition",
	"athlete_reason" text,
	"carried_from_action_id" uuid,
	"reviewed_at_meeting_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_id" uuid NOT NULL,
	"category" "goal_category" NOT NULL,
	"text" text NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"momentum" "goal_momentum",
	"coach_reason" text,
	"athlete_disposition" "disposition",
	"athlete_reason" text,
	"carried_from_goal_id" uuid,
	"reviewed_at_meeting_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_action_items" ADD CONSTRAINT "feedback_action_items_feedback_id_feedback_forms_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_action_items" ADD CONSTRAINT "feedback_action_items_kata_id_kata_id_fk" FOREIGN KEY ("kata_id") REFERENCES "public"."kata"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_action_items" ADD CONSTRAINT "feedback_action_items_carried_from_action_id_feedback_action_items_id_fk" FOREIGN KEY ("carried_from_action_id") REFERENCES "public"."feedback_action_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_action_items" ADD CONSTRAINT "feedback_action_items_reviewed_at_meeting_id_feedback_forms_id_fk" FOREIGN KEY ("reviewed_at_meeting_id") REFERENCES "public"."feedback_forms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_goals" ADD CONSTRAINT "feedback_goals_feedback_id_feedback_forms_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_goals" ADD CONSTRAINT "feedback_goals_carried_from_goal_id_feedback_goals_id_fk" FOREIGN KEY ("carried_from_goal_id") REFERENCES "public"."feedback_goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_goals" ADD CONSTRAINT "feedback_goals_reviewed_at_meeting_id_feedback_forms_id_fk" FOREIGN KEY ("reviewed_at_meeting_id") REFERENCES "public"."feedback_forms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_action_items_feedback_idx" ON "feedback_action_items" USING btree ("feedback_id","sort_order");--> statement-breakpoint
CREATE INDEX "feedback_action_items_carried_idx" ON "feedback_action_items" USING btree ("carried_from_action_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_action_items_carry_uq" ON "feedback_action_items" USING btree ("feedback_id","carried_from_action_id");--> statement-breakpoint
CREATE INDEX "feedback_goals_feedback_idx" ON "feedback_goals" USING btree ("feedback_id","sort_order");--> statement-breakpoint
CREATE INDEX "feedback_goals_carried_idx" ON "feedback_goals" USING btree ("carried_from_goal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_goals_carry_uq" ON "feedback_goals" USING btree ("feedback_id","carried_from_goal_id");--> statement-breakpoint
-- Backfill goals from the legacy goal_* columns. Clean slate: each row is stamped
-- reviewed_at_meeting_id = its own feedback id so it reads as a current goal in the
-- overview/portal but is skipped by the review query (status='active' AND
-- reviewed_at_meeting_id IS NULL). The loop only engages for goals created after this.
INSERT INTO "feedback_goals" ("feedback_id","category","text","status","sort_order","reviewed_at_meeting_id")
SELECT "id",'main',btrim("goal_main"),'active',0,"id" FROM "feedback_forms"
WHERE "goal_main" IS NOT NULL AND btrim("goal_main") <> '';--> statement-breakpoint
INSERT INTO "feedback_goals" ("feedback_id","category","text","status","sort_order","reviewed_at_meeting_id")
SELECT "id",'performance',btrim("goal_performance"),'active',1,"id" FROM "feedback_forms"
WHERE "goal_performance" IS NOT NULL AND btrim("goal_performance") <> '';--> statement-breakpoint
INSERT INTO "feedback_goals" ("feedback_id","category","text","status","sort_order","reviewed_at_meeting_id")
SELECT "id",'outcome',btrim("goal_outcome"),'active',2,"id" FROM "feedback_forms"
WHERE "goal_outcome" IS NOT NULL AND btrim("goal_outcome") <> '';--> statement-breakpoint
INSERT INTO "feedback_goals" ("feedback_id","category","text","status","sort_order","reviewed_at_meeting_id")
SELECT "id",'kata_focus',btrim("kata_focus"),'active',3,"id" FROM "feedback_forms"
WHERE "kata_focus" IS NOT NULL AND btrim("kata_focus") <> '';--> statement-breakpoint
-- Backfill action items from the legacy action_1..4 columns. Clean slate: landed
-- 'done' so no legacy action surfaces in the next meeting's review panel.
INSERT INTO "feedback_action_items" ("feedback_id","text","sort_order","coach_disposition")
SELECT "id",btrim("action_1"),0,'done' FROM "feedback_forms"
WHERE "action_1" IS NOT NULL AND btrim("action_1") <> '';--> statement-breakpoint
INSERT INTO "feedback_action_items" ("feedback_id","text","sort_order","coach_disposition")
SELECT "id",btrim("action_2"),1,'done' FROM "feedback_forms"
WHERE "action_2" IS NOT NULL AND btrim("action_2") <> '';--> statement-breakpoint
INSERT INTO "feedback_action_items" ("feedback_id","text","sort_order","coach_disposition")
SELECT "id",btrim("action_3"),2,'done' FROM "feedback_forms"
WHERE "action_3" IS NOT NULL AND btrim("action_3") <> '';--> statement-breakpoint
INSERT INTO "feedback_action_items" ("feedback_id","text","sort_order","coach_disposition")
SELECT "id",btrim("action_4"),3,'done' FROM "feedback_forms"
WHERE "action_4" IS NOT NULL AND btrim("action_4") <> '';
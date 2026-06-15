CREATE TYPE "public"."competition_type" AS ENUM('club', 'regional', 'national', 'international');--> statement-breakpoint
CREATE TYPE "public"."flex_category" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."form_type" AS ENUM('U12', 'U16');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."kata_category" AS ENUM('competition', 'development');--> statement-breakpoint
CREATE TYPE "public"."round_result" AS ENUM('win', 'loss');--> statement-breakpoint
CREATE TABLE "athlete_kata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"kata_id" uuid NOT NULL,
	"round_order" integer,
	"is_competition_kata" boolean DEFAULT false NOT NULL,
	"proficiency" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athletes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" "gender" NOT NULL,
	"belt_rank" text NOT NULL,
	"years_training" integer DEFAULT 0 NOT NULL,
	"years_competing" integer,
	"height_cm" integer,
	"weight_kg" integer,
	"notes" text,
	"physical_notes" text,
	"view_token" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "athletes_view_token_unique" UNIQUE("view_token")
);
--> statement-breakpoint
CREATE TABLE "competition_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"category" text NOT NULL,
	"result_placement" integer,
	"result_round_reached" text,
	"kata_round_1" uuid,
	"kata_round_1_result" "round_result",
	"kata_round_2" uuid,
	"kata_round_2_result" "round_result",
	"kata_round_3" uuid,
	"kata_round_3_result" "round_result",
	"kata_round_4" uuid,
	"kata_round_4_result" "round_result",
	"kata_final" uuid,
	"kata_final_result" "round_result",
	"feedback_before" text,
	"feedback_performance" text,
	"feedback_improvement" text,
	"feedback_lesson" text,
	"coach_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"location" text,
	"competition_type" "competition_type" NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"form_type" "form_type" NOT NULL,
	"meeting_number" integer NOT NULL,
	"meeting_date" date NOT NULL,
	"season" text NOT NULL,
	"athlete_proud_of" text,
	"athlete_hardest_thing" text,
	"athlete_show_parents" text,
	"athlete_fun_score" integer,
	"athlete_make_more_fun" text,
	"athlete_question" text,
	"self_rating_training" integer,
	"self_rating_motivation" integer,
	"self_rating_body" integer,
	"self_rating_competition" integer,
	"athlete_needs_work" text,
	"coach_strength" text,
	"coach_development_area" text,
	"goal_main" text,
	"goal_performance" text,
	"goal_outcome" text,
	"kata_focus" text,
	"action_1" text,
	"action_2" text,
	"action_3" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "kata_category" NOT NULL,
	"split_quarter" boolean DEFAULT false NOT NULL,
	"split_third" boolean DEFAULT false NOT NULL,
	"split_half" boolean DEFAULT false NOT NULL,
	"flexibility_category" "flex_category" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "kata_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "kata_scoring_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"kata_id" uuid NOT NULL,
	"assessment_date" date NOT NULL,
	"stances" integer NOT NULL,
	"techniques" integer NOT NULL,
	"transitions" integer NOT NULL,
	"timing" integer NOT NULL,
	"breathing" integer NOT NULL,
	"kiai" integer NOT NULL,
	"kime" integer NOT NULL,
	"conformance" integer NOT NULL,
	"strength" integer NOT NULL,
	"speed" integer NOT NULL,
	"balance" integer NOT NULL,
	"rhythm" integer NOT NULL,
	"overall_impression" integer NOT NULL,
	"kata_specific_notes" text,
	"priority_improvements" text,
	"strengths" text,
	"coach_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athlete_kata" ADD CONSTRAINT "athlete_kata_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_kata" ADD CONSTRAINT "athlete_kata_kata_id_kata_id_fk" FOREIGN KEY ("kata_id") REFERENCES "public"."kata"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_entries" ADD CONSTRAINT "competition_entries_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_entries" ADD CONSTRAINT "competition_entries_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_entries" ADD CONSTRAINT "competition_entries_kata_round_1_kata_id_fk" FOREIGN KEY ("kata_round_1") REFERENCES "public"."kata"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_entries" ADD CONSTRAINT "competition_entries_kata_round_2_kata_id_fk" FOREIGN KEY ("kata_round_2") REFERENCES "public"."kata"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_entries" ADD CONSTRAINT "competition_entries_kata_round_3_kata_id_fk" FOREIGN KEY ("kata_round_3") REFERENCES "public"."kata"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_entries" ADD CONSTRAINT "competition_entries_kata_round_4_kata_id_fk" FOREIGN KEY ("kata_round_4") REFERENCES "public"."kata"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_entries" ADD CONSTRAINT "competition_entries_kata_final_kata_id_fk" FOREIGN KEY ("kata_final") REFERENCES "public"."kata"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD CONSTRAINT "feedback_forms_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kata_scoring_cards" ADD CONSTRAINT "kata_scoring_cards_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kata_scoring_cards" ADD CONSTRAINT "kata_scoring_cards_kata_id_kata_id_fk" FOREIGN KEY ("kata_id") REFERENCES "public"."kata"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scoring_athlete_kata_date_idx" ON "kata_scoring_cards" USING btree ("athlete_id","kata_id","assessment_date");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
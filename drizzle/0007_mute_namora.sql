CREATE TYPE "public"."clip_added_by" AS ENUM('coach', 'athlete');--> statement-breakpoint
CREATE TYPE "public"."clip_context_type" AS ENUM('score_card', 'competition_entry', 'athlete_kata');--> statement-breakpoint
CREATE TYPE "public"."clip_kind" AS ENUM('raw', 'analysis', 'comparison', 'still');--> statement-breakpoint
CREATE TYPE "public"."clip_provider" AS ENUM('cloudflare_stream');--> statement-breakpoint
CREATE TYPE "public"."clip_status" AS ENUM('uploading', 'processing', 'ready', 'error');--> statement-breakpoint
CREATE TYPE "public"."clip_visibility" AS ENUM('coach_only', 'portal');--> statement-breakpoint
CREATE TABLE "clip_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clip_id" uuid NOT NULL,
	"context_type" "clip_context_type" NOT NULL,
	"context_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"kata_id" uuid,
	"kind" "clip_kind" DEFAULT 'raw' NOT NULL,
	"derived_from_clip_id" uuid,
	"provider" "clip_provider" DEFAULT 'cloudflare_stream' NOT NULL,
	"asset_id" text NOT NULL,
	"status" "clip_status" DEFAULT 'uploading' NOT NULL,
	"duration_ms" integer,
	"thumbnail_url" text,
	"visibility" "clip_visibility" DEFAULT 'coach_only' NOT NULL,
	"recorded_at" timestamp,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_clips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_id" uuid NOT NULL,
	"clip_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"caption" text,
	"added_by" "clip_added_by" DEFAULT 'coach' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clip_attachments" ADD CONSTRAINT "clip_attachments_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_kata_id_kata_id_fk" FOREIGN KEY ("kata_id") REFERENCES "public"."kata"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_derived_from_clip_id_clips_id_fk" FOREIGN KEY ("derived_from_clip_id") REFERENCES "public"."clips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_clips" ADD CONSTRAINT "feedback_clips_feedback_id_feedback_forms_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_clips" ADD CONSTRAINT "feedback_clips_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clip_attachments_clip_context_idx" ON "clip_attachments" USING btree ("clip_id","context_type","context_id");--> statement-breakpoint
CREATE INDEX "clip_attachments_context_idx" ON "clip_attachments" USING btree ("context_type","context_id");--> statement-breakpoint
CREATE INDEX "clips_athlete_kind_idx" ON "clips" USING btree ("athlete_id","kind");--> statement-breakpoint
CREATE INDEX "clips_derived_from_idx" ON "clips" USING btree ("derived_from_clip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_clips_feedback_clip_idx" ON "feedback_clips" USING btree ("feedback_id","clip_id");--> statement-breakpoint
CREATE INDEX "feedback_clips_feedback_order_idx" ON "feedback_clips" USING btree ("feedback_id","sort_order");
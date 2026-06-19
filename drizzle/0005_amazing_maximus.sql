ALTER TABLE "athletes" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "parental_consent_at" timestamp;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "parental_consent_name" text;--> statement-breakpoint
ALTER TABLE "feedback_forms" ADD COLUMN "last_reminder_at" timestamp;
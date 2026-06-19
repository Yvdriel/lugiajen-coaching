ALTER TABLE "athletes" ADD COLUMN "consent_token" text;--> statement-breakpoint
ALTER TABLE "athletes" ADD COLUMN "consent_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_consent_token_unique" UNIQUE("consent_token");
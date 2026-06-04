ALTER TABLE "consultants" ADD COLUMN "role" text DEFAULT 'Consultor' NOT NULL;--> statement-breakpoint
ALTER TABLE "company_settings" DROP COLUMN "consultant_term";
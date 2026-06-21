CREATE TABLE "suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"user_id" uuid,
	"author_email" text,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'melhoria' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "status" SET DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "logo_dark" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "downloads_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
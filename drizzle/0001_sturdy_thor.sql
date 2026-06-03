CREATE TABLE "company_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"logo" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "billing_customers" (
	"email" text PRIMARY KEY NOT NULL,
	"plan" text DEFAULT 'individual' NOT NULL,
	"seat_limit" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"provider" text,
	"product_id" text,
	"subscription_id" text,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

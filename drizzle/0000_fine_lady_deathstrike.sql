CREATE TABLE "block_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"block" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solution_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"solution_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"billing" text DEFAULT 'recorrente' NOT NULL,
	"price" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solutions" (
	"id" text PRIMARY KEY NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"problem_solved" text DEFAULT '' NOT NULL,
	"how_it_works" text DEFAULT '' NOT NULL,
	"expected_benefit" text DEFAULT '' NOT NULL,
	"deliverables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scope" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timeline" text DEFAULT '' NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "solution_plans" ADD CONSTRAINT "solution_plans_solution_id_solutions_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."solutions"("id") ON DELETE cascade ON UPDATE no action;
// Schema Drizzle — espelha os tipos do catálogo/templates.
// Arrays de string e payloads ficam em jsonb. IDs são text (o app gera uuids/seeds).

import {
  pgTable,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const solutions = pgTable("solutions", {
  id: text("id").primaryKey(),
  icon: text("icon").notNull().default(""),
  name: text("name").notNull().default(""),
  tagline: text("tagline").notNull().default(""),
  problemSolved: text("problem_solved").notNull().default(""),
  howItWorks: text("how_it_works").notNull().default(""),
  expectedBenefit: text("expected_benefit").notNull().default(""),
  deliverables: jsonb("deliverables").$type<string[]>().notNull().default([]),
  scope: jsonb("scope").$type<string[]>().notNull().default([]),
  timeline: text("timeline").notNull().default(""),
  highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
  requirements: jsonb("requirements").$type<string[]>().notNull().default([]),
  notes: text("notes").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const solutionPlans = pgTable("solution_plans", {
  id: text("id").primaryKey(),
  solutionId: text("solution_id")
    .notNull()
    .references(() => solutions.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  billing: text("billing").notNull().default("recorrente"), // recorrente | pontual
  price: text("price").notNull().default(""),
  description: text("description").notNull().default(""),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const companySettings = pgTable("company_settings", {
  id: text("id").primaryKey(), // sempre "default" (linha única)
  logo: text("logo"), // PNG em data URL base64 (transparente), nullable
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const consultants = pgTable("consultants", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const blockTemplates = pgTable("block_templates", {
  id: text("id").primaryKey(),
  block: text("block").notNull(), // understanding | cost | strategy | ...
  name: text("name").notNull().default(""),
  payload: jsonb("payload")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

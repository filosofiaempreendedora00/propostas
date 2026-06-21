// Schema Drizzle — espelha os tipos do catálogo/templates.
// Arrays de string e payloads ficam em jsonb. IDs são text (o app gera uuids/seeds).

import {
  pgTable,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

// ---------------- Multi-tenant: organizações, membros e convites ----------------

// Cada comprador = uma organização. O plano define o limite de assentos.
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("Minha empresa"),
  ownerId: uuid("owner_id").notNull(), // auth.users.id (FK adicionada via SQL)
  plan: text("plan").notNull().default("individual"), // individual | time
  seatLimit: integer("seat_limit").notNull().default(1),
  status: text("status").notNull().default("free"), // free | active | past_due | canceled
  downloadsUsed: integer("downloads_used").notNull().default(0), // freemium: cota grátis usada
  billingProvider: text("billing_provider"), // ex: kiwify
  billingRef: text("billing_ref"), // id da assinatura no provedor
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Vínculo usuário ↔ organização (1 usuário pode estar em várias orgs).
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(), // auth.users.id
    role: text("role").notNull().default("member"), // owner | member
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("memberships_org_user_uq").on(t.orgId, t.userId)],
);

// Assinaturas vindas do provedor de pagamento (Kiwify), chaveadas por e-mail —
// funciona mesmo se a pessoa comprar antes de criar a conta no app.
export const billingCustomers = pgTable("billing_customers", {
  email: text("email").primaryKey(), // sempre em minúsculas
  plan: text("plan").notNull().default("individual"), // individual | time
  seatLimit: integer("seat_limit").notNull().default(1),
  status: text("status").notNull().default("active"), // active | canceled | past_due
  provider: text("provider"), // kiwify
  productId: text("product_id"),
  subscriptionId: text("subscription_id"),
  raw: jsonb("raw").$type<Record<string, unknown>>(), // último payload (debug)
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Convites pendentes (o dono convida vendedores por e-mail).
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  token: uuid("token").notNull().defaultRandom().unique(),
  invitedBy: uuid("invited_by"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const solutions = pgTable("solutions", {
  id: text("id").primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
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
  orgId: uuid("org_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
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
  id: text("id").primaryKey(), // "default" por org (chave vira org_id no passo 2)
  orgId: uuid("org_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  logo: text("logo"), // logo p/ FUNDO ESCURO (versão clara). data URL base64, nullable
  logoDark: text("logo_dark"), // logo p/ FUNDO CLARO (versão escura). data URL, nullable
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const consultants = pgTable("consultants", {
  id: text("id").primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull().default(""),
  role: text("role").notNull().default("Consultor"), // cargo/papel comercial
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Sugestões de melhoria enviadas pelos clientes. O master tria num Kanban.
export const suggestions = pgTable("suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, {
    onDelete: "set null",
  }), // mantém a sugestão mesmo se a conta for removida
  userId: uuid("user_id"), // auth.users.id (autor)
  authorEmail: text("author_email"), // denormalizado p/ exibir no painel
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  category: text("category").notNull().default("melhoria"), // ideia | melhoria | problema | outro
  status: text("status").notNull().default("new"), // new | reviewing | planned | done | declined
  adminNote: text("admin_note").notNull().default(""), // anotação interna do master
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const blockTemplates = pgTable("block_templates", {
  id: text("id").primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
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

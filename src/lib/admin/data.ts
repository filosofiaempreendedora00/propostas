import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/org";
import { FREE_DOWNLOADS } from "@/lib/limits";
import { aiCostUsd } from "@/lib/ai/pricing";

// E-mails autorizados a ver o painel /admin (configurável por env).
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Contas internas/teste (minhas + demo) — NÃO entram como lead/cliente real
// nas KPIs do topo nem na temperatura. Extensível por INTERNAL_EMAILS (csv) no env.
function internalEmails(): Set<string> {
  const extra = (process.env.INTERNAL_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([
    ...adminEmails(),
    "demo@kronos.dev",
    "filosofia.empreendedora00@gmail.com",
    "roberto_fpj1@hotmail.com",
    "robertofachetti2@gmail.com",
    ...extra,
  ]);
}

// O usuário logado é admin master?
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const user = await requireUser();
    const email = user.email?.toLowerCase();
    return !!email && adminEmails().includes(email);
  } catch {
    return false;
  }
}

// Temperatura do lead — quão engajado/quente ele está.
export type Temperature = "cliente" | "quente" | "morno" | "frio";

export type AdminOrg = {
  id: string;
  name: string;
  plan: string;
  status: string;
  seatLimit: number;
  members: number;
  pending: number;
  ownerEmail: string | null;
  createdAt: string | null;
  downloadsUsed: number; // propostas baixadas na cota grátis (0..FREE_DOWNLOADS)
  firstDownloadAt: string | null;
  // sinais de engajamento (deixou de usar o padrão de exemplo):
  hasLogo: boolean;
  customConsultant: boolean;
  customSolution: boolean;
  customPlan: boolean;
  temperature: Temperature;
};

// Detalhe completo de uma conta — carregado ao clicar/expandir no painel.
export type AccountDetail = {
  signupName: string | null;
  solutions: { name: string; tagline: string }[];
  consultants: { name: string; role: string; email: string; phone: string }[];
  plansCount: number;
  templatesCount: number;
  hasLogo: boolean;
  hasLogoDark: boolean;
};

export type AdminEvent = {
  email: string;
  plan: string;
  status: string;
  provider: string | null;
  productId: string | null;
  updatedAt: string | null;
};

// Custo de IA — uma linha por geração de catálogo (só admin vê).
export type AdminAiGeneration = {
  createdAt: string | null;
  email: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  solutions: number;
  usd: number; // custo calculado a partir dos tokens
};

export type AdminAiUsage = {
  totalUsd: number;
  count: number;
  generations: AdminAiGeneration[];
};

export type AdminOverview = {
  totals: {
    orgs: number;
    active: number;
    inactive: number;
    canceled: number;
    users: number;
    individual: number;
    time: number;
    exhausted: number; // contas grátis que esgotaram os 3 downloads
    hot: number; // leads "quentes" (engajados, ainda não clientes)
  };
  freeDownloads: number;
  orgs: AdminOrg[];
  events: AdminEvent[];
  aiUsage: AdminAiUsage;
};

// Pontua o engajamento e devolve a temperatura.
function temperatureOf(o: {
  status: string;
  downloadsUsed: number;
  hasLogo: boolean;
  customConsultant: boolean;
  customSolution: boolean;
  customPlan: boolean;
}): Temperature {
  if (o.status === "active") return "cliente";
  const score =
    (o.hasLogo ? 2 : 0) +
    (o.customConsultant ? 2 : 0) +
    (o.customSolution ? 2 : 0) +
    (o.customPlan ? 1 : 0) +
    Math.min(o.downloadsUsed, 3);
  if (score >= 4) return "quente";
  if (score >= 1) return "morno";
  return "frio";
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const orgsRaw = (await db.execute(sql`
    select
      o.id                                  as id,
      o.name                                as name,
      o.plan                                as plan,
      o.status                              as status,
      o.seat_limit                          as seat_limit,
      o.downloads_used                      as downloads_used,
      o.first_download_at                   as first_download_at,
      o.created_at                          as created_at,
      (select u.email from auth.users u where u.id = o.owner_id) as owner_email,
      (select count(*)::int from memberships m where m.org_id = o.id) as members,
      (select count(*)::int from invitations i
         where i.org_id = o.id and i.accepted_at is null)             as pending,
      exists(
        select 1 from company_settings cs where cs.org_id = o.id
        and ((cs.logo is not null and length(cs.logo) > 100)
          or (cs.logo_dark is not null and length(cs.logo_dark) > 100))
      ) as has_logo,
      exists(
        select 1 from consultants c where c.org_id = o.id
        and (c.name <> 'Nome do Consultor' or c.email <> 'consultor@suaempresa.com')
      ) as custom_consultant,
      exists(
        select 1 from solutions s where s.org_id = o.id
        and (s.name !~ '^Solução [0-9]+$'
          or (s.tagline <> '' and s.tagline not in (
            'Resumo de uma linha do que esta solução entrega.',
            'Outra frente de trabalho, totalmente preenchível.')))
      ) as custom_solution,
      exists(
        select 1 from solution_plans p where p.org_id = o.id
        and (p.name !~ '^Plano [0-9]+$'
          or p.price not in ('R$ 2.997', 'R$ 4.997', 'R$ 14.997'))
      ) as custom_plan
    from organizations o
    order by o.created_at desc
  `)) as unknown as Array<{
    id: string;
    name: string;
    plan: string;
    status: string;
    seat_limit: number;
    downloads_used: number;
    first_download_at: Date | string | null;
    created_at: Date | string | null;
    owner_email: string | null;
    members: number;
    pending: number;
    has_logo: boolean;
    custom_consultant: boolean;
    custom_solution: boolean;
    custom_plan: boolean;
  }>;

  const [{ n: users }] = (await db.execute(
    sql`select count(*)::int as n from auth.users`,
  )) as unknown as Array<{ n: number }>;

  const eventsRaw = (await db.execute(sql`
    select email, plan, status, provider, product_id, updated_at
    from billing_customers
    order by updated_at desc nulls last
    limit 50
  `)) as unknown as Array<{
    email: string;
    plan: string;
    status: string;
    provider: string | null;
    product_id: string | null;
    updated_at: Date | string | null;
  }>;

  const toIso = (d: Date | string | null) =>
    d == null ? null : d instanceof Date ? d.toISOString() : String(d);

  // Contas internas/teste não enviesam temperatura nem KPIs.
  const internal = internalEmails();
  const isInt = (e: string | null) => internal.has((e ?? "").toLowerCase());

  const orgs: AdminOrg[] = orgsRaw.map((o) => {
    const base = {
      downloadsUsed: Number(o.downloads_used) || 0,
      hasLogo: !!o.has_logo,
      customConsultant: !!o.custom_consultant,
      customSolution: !!o.custom_solution,
      customPlan: !!o.custom_plan,
    };
    return {
      id: o.id,
      name: o.name,
      plan: o.plan,
      status: o.status,
      seatLimit: o.seat_limit,
      members: o.members,
      pending: o.pending,
      ownerEmail: o.owner_email,
      createdAt: toIso(o.created_at),
      firstDownloadAt: toIso(o.first_download_at),
      ...base,
      temperature: isInt(o.owner_email)
        ? "frio"
        : temperatureOf({ status: o.status, ...base }),
    };
  });

  // KPIs sobre contas REAIS (sem as internas/teste).
  const real = orgs.filter((o) => !isInt(o.ownerEmail));
  const totals = {
    orgs: orgs.length,
    active: real.filter((o) => o.status === "active").length,
    inactive: real.filter((o) => o.status === "inactive").length,
    canceled: real.filter((o) => o.status === "canceled").length,
    users: Number(users) || 0,
    individual: real.filter((o) => o.plan === "individual").length,
    time: real.filter((o) => o.plan === "time").length,
    exhausted: real.filter(
      (o) => o.status !== "active" && o.downloadsUsed >= FREE_DOWNLOADS,
    ).length,
    hot: real.filter((o) => o.temperature === "quente").length,
  };

  const events: AdminEvent[] = eventsRaw.map((e) => ({
    email: e.email,
    plan: e.plan,
    status: e.status,
    provider: e.provider,
    productId: e.product_id,
    updatedAt: toIso(e.updated_at),
  }));

  // Custo de IA por geração (try/catch: a tabela pode não existir ainda).
  let aiUsage: AdminAiUsage = { totalUsd: 0, count: 0, generations: [] };
  try {
    const genRows = (await db.execute(sql`
      select
        g.created_at,
        g.model,
        g.input_tokens,
        g.output_tokens,
        g.solutions,
        coalesce(
          g.user_email,
          (select u.email from auth.users u where u.id = o.owner_id)
        ) as email
      from ai_generations g
      left join organizations o on o.id = g.org_id
      order by g.created_at desc
      limit 1000
    `)) as unknown as Array<{
      created_at: Date | string | null;
      model: string;
      input_tokens: number;
      output_tokens: number;
      solutions: number;
      email: string | null;
    }>;
    const generations: AdminAiGeneration[] = genRows.map((r) => {
      const inTok = Number(r.input_tokens) || 0;
      const outTok = Number(r.output_tokens) || 0;
      return {
        createdAt: toIso(r.created_at),
        email: r.email,
        model: r.model,
        inputTokens: inTok,
        outputTokens: outTok,
        solutions: Number(r.solutions) || 0,
        usd: aiCostUsd(r.model, inTok, outTok),
      };
    });
    aiUsage = {
      totalUsd: generations.reduce((s, g) => s + g.usd, 0),
      count: generations.length,
      generations,
    };
  } catch {
    /* tabela ai_generations ainda não migrada → custo zerado */
  }

  return { totals, orgs, events, aiUsage, freeDownloads: FREE_DOWNLOADS };
}

"use server";

import { randomUUID } from "node:crypto";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  solutions,
  solutionPlans,
  consultants,
  aiGenerations,
} from "@/lib/db/schema";
import { requireOrgId, requireUser } from "@/lib/auth/org";
import { LIMITS, LimitError, FREE_AI_GENERATIONS } from "@/lib/limits";
import type { CatalogSolution, CatalogConsultant, Billing } from "./types";
import { SEED_SOLUTIONS, SEED_CONSULTANTS } from "./seed";
import { generateCatalogFromBrief } from "./ai";

// IDs do seed são fixos; ao semear para uma org nova, geramos IDs frescos
// (o ID é PK global — reaproveitar causaria colisão entre orgs).
function freshSolution(s: CatalogSolution): CatalogSolution {
  return {
    ...s,
    id: randomUUID(),
    plans: s.plans.map((p) => ({ ...p, id: randomUUID() })),
  };
}

// ---------------- Soluções ----------------

type SolutionRow = typeof solutions.$inferSelect;
type PlanRow = typeof solutionPlans.$inferSelect;

function rowToSolution(s: SolutionRow, plans: PlanRow[]): CatalogSolution {
  return {
    id: s.id,
    icon: s.icon,
    name: s.name,
    tagline: s.tagline,
    problemSolved: s.problemSolved,
    howItWorks: s.howItWorks,
    expectedBenefit: s.expectedBenefit,
    deliverables: s.deliverables,
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      billing: p.billing as Billing,
      price: p.price,
      description: p.description,
      features: p.features,
      featured: p.featured,
    })),
    scope: s.scope,
    timeline: s.timeline,
    highlights: s.highlights,
    requirements: s.requirements,
    notes: s.notes,
  };
}

async function writeSolution(
  orgId: string,
  sol: CatalogSolution,
  sortOrder: number,
) {
  await db.transaction(async (tx) => {
    const base = {
      orgId,
      icon: sol.icon,
      name: sol.name,
      tagline: sol.tagline,
      problemSolved: sol.problemSolved,
      howItWorks: sol.howItWorks,
      expectedBenefit: sol.expectedBenefit,
      deliverables: sol.deliverables,
      scope: sol.scope,
      timeline: sol.timeline,
      highlights: sol.highlights,
      requirements: sol.requirements,
      notes: sol.notes,
      sortOrder,
      updatedAt: new Date(),
    };
    await tx
      .insert(solutions)
      .values({ id: sol.id, ...base })
      .onConflictDoUpdate({
        target: solutions.id,
        set: base,
        where: eq(solutions.orgId, orgId), // só atualiza se for da própria org
      });

    await tx
      .delete(solutionPlans)
      .where(
        and(
          eq(solutionPlans.solutionId, sol.id),
          eq(solutionPlans.orgId, orgId),
        ),
      );
    const plans = sol.plans.slice(0, LIMITS.plansPerSolution);
    if (plans.length > 0) {
      await tx.insert(solutionPlans).values(
        plans.map((p, i) => ({
          id: p.id,
          orgId,
          solutionId: sol.id,
          name: p.name,
          billing: p.billing,
          price: p.price,
          description: p.description,
          features: p.features,
          featured: p.featured,
          sortOrder: i,
        })),
      );
    }
  });
}

export async function listSolutions(): Promise<CatalogSolution[]> {
  const orgId = await requireOrgId();
  let sols = await db
    .select()
    .from(solutions)
    .where(eq(solutions.orgId, orgId))
    .orderBy(asc(solutions.sortOrder), asc(solutions.createdAt));

  // Seed no primeiro acesso DESTA organização.
  if (sols.length === 0) {
    for (let i = 0; i < SEED_SOLUTIONS.length; i++) {
      await writeSolution(orgId, freshSolution(SEED_SOLUTIONS[i]), i);
    }
    sols = await db
      .select()
      .from(solutions)
      .where(eq(solutions.orgId, orgId))
      .orderBy(asc(solutions.sortOrder), asc(solutions.createdAt));
  }

  const plans = await db
    .select()
    .from(solutionPlans)
    .where(eq(solutionPlans.orgId, orgId))
    .orderBy(asc(solutionPlans.sortOrder));
  const byId = new Map<string, PlanRow[]>();
  for (const p of plans) {
    const arr = byId.get(p.solutionId) ?? [];
    arr.push(p);
    byId.set(p.solutionId, arr);
  }
  return sols.map((s) => rowToSolution(s, byId.get(s.id) ?? []));
}

export async function upsertSolution(
  sol: CatalogSolution,
  sortOrder: number,
): Promise<void> {
  const orgId = await requireOrgId();
  // Trava: bloqueia criar solução nova acima do limite.
  const exists = await db
    .select({ id: solutions.id })
    .from(solutions)
    .where(and(eq(solutions.id, sol.id), eq(solutions.orgId, orgId)))
    .limit(1);
  if (exists.length === 0) {
    const [{ c }] = await db
      .select({ c: count() })
      .from(solutions)
      .where(eq(solutions.orgId, orgId));
    if (Number(c) >= LIMITS.solutions) {
      throw new LimitError(`Limite de ${LIMITS.solutions} soluções atingido.`);
    }
  }
  await writeSolution(orgId, sol, sortOrder);
}

export async function deleteSolution(id: string): Promise<void> {
  const orgId = await requireOrgId();
  await db
    .delete(solutions)
    .where(and(eq(solutions.id, id), eq(solutions.orgId, orgId))); // cascade nos planos
}

// ---------------- Consultores ----------------

export async function listConsultants(): Promise<CatalogConsultant[]> {
  const orgId = await requireOrgId();
  let rows = await db
    .select()
    .from(consultants)
    .where(eq(consultants.orgId, orgId))
    .orderBy(asc(consultants.sortOrder), asc(consultants.createdAt));

  if (rows.length === 0) {
    await db
      .insert(consultants)
      .values(
        SEED_CONSULTANTS.map((c, i) => ({
          ...c,
          id: randomUUID(),
          orgId,
          sortOrder: i,
        })),
      );
    rows = await db
      .select()
      .from(consultants)
      .where(eq(consultants.orgId, orgId))
      .orderBy(asc(consultants.sortOrder), asc(consultants.createdAt));
  }

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    email: c.email,
    phone: c.phone,
  }));
}

export async function upsertConsultant(
  c: CatalogConsultant,
  sortOrder: number,
): Promise<void> {
  const orgId = await requireOrgId();
  const exists = await db
    .select({ id: consultants.id })
    .from(consultants)
    .where(and(eq(consultants.id, c.id), eq(consultants.orgId, orgId)))
    .limit(1);
  if (exists.length === 0) {
    const [{ c: n }] = await db
      .select({ c: count() })
      .from(consultants)
      .where(eq(consultants.orgId, orgId));
    if (Number(n) >= LIMITS.consultants) {
      throw new LimitError(
        `Limite de ${LIMITS.consultants} consultores atingido.`,
      );
    }
  }
  const base = {
    orgId,
    name: c.name,
    role: c.role,
    email: c.email,
    phone: c.phone,
    sortOrder,
  };
  await db
    .insert(consultants)
    .values({ id: c.id, ...base })
    .onConflictDoUpdate({
      target: consultants.id,
      set: base,
      where: eq(consultants.orgId, orgId),
    });
}

export async function deleteConsultant(id: string): Promise<void> {
  const orgId = await requireOrgId();
  await db
    .delete(consultants)
    .where(and(eq(consultants.id, id), eq(consultants.orgId, orgId)));
}

// ---------------- Geração por IA ----------------

// Gera o catálogo (soluções + planos + 1 consultor) a partir de uma descrição
// curta do negócio e SUBSTITUI o catálogo atual da organização pelo gerado.
// Tudo escopado por orgId — multi-tenant preservado. O usuário revisa/edita
// depois nos campos normais antes de gerar a proposta.
// Conta nova? = não tem nenhuma solução REAL (só vazio ou o seed de exemplo).
// Usado na /inicio pra liderar com o onboarding por IA.
export async function hasRealCatalog(): Promise<boolean> {
  const orgId = await requireOrgId();
  try {
    const rows = (await db.execute(sql`
      select 1 from solutions s
      where s.org_id = ${orgId}
        and (s.name !~ '^Solução [0-9]+$'
          or (s.tagline <> '' and s.tagline not in (
            'Resumo de uma linha do que esta solução entrega.',
            'Outra frente de trabalho, totalmente preenchível.')))
      limit 1
    `)) as unknown as unknown[];
    return rows.length > 0;
  } catch {
    return false; // na dúvida, trata como conta nova (mostra a IA)
  }
}

// Quantas gerações por IA a org ainda tem (mostra "X de 3" no modal).
export async function getAiGenerationsLeft(): Promise<{
  used: number;
  limit: number;
  remaining: number;
}> {
  const orgId = await requireOrgId();
  let used = 0;
  try {
    const [{ c }] = await db
      .select({ c: count() })
      .from(aiGenerations)
      .where(eq(aiGenerations.orgId, orgId));
    used = Number(c) || 0;
  } catch {
    used = 0; // tabela ainda não migrada → não trava
  }
  return {
    used,
    limit: FREE_AI_GENERATIONS,
    remaining: Math.max(0, FREE_AI_GENERATIONS - used),
  };
}

export async function generateAndReplaceCatalog(
  brief: string,
): Promise<{ solutions: number }> {
  const orgId = await requireOrgId();

  // Trava anti-abuso: no máximo FREE_AI_GENERATIONS por conta.
  try {
    const [{ c }] = await db
      .select({ c: count() })
      .from(aiGenerations)
      .where(eq(aiGenerations.orgId, orgId));
    if (Number(c) >= FREE_AI_GENERATIONS) {
      throw new LimitError(
        `Você já usou suas ${FREE_AI_GENERATIONS} gerações por IA. Sem problema — agora é só editar e revisar seu catálogo nos campos normais, é rápido.`,
      );
    }
  } catch (e) {
    if (e instanceof LimitError) throw e;
    // erro de contagem (ex.: tabela ausente) → não bloqueia a geração
  }

  const { solutions: generated, consultant, usage } =
    await generateCatalogFromBrief(brief);

  // Substitui o catálogo: apaga soluções (cascata nos planos) e consultores
  // antigos desta org, depois grava o que a IA gerou.
  await db.delete(solutions).where(eq(solutions.orgId, orgId));
  await db.delete(consultants).where(eq(consultants.orgId, orgId));

  for (let i = 0; i < generated.length; i++) {
    await writeSolution(orgId, generated[i], i);
  }
  await db.insert(consultants).values({
    id: randomUUID(),
    orgId,
    name: consultant.name,
    role: consultant.role,
    email: "", // contato real é preenchido pelo usuário (IA não inventa)
    phone: "",
    sortOrder: 0,
  });

  // Registra o custo (tokens) — visível só no painel admin. Nunca quebra a
  // geração: se o log falhar (ex.: tabela ainda não migrada), só ignora.
  try {
    const user = await requireUser();
    await db.insert(aiGenerations).values({
      orgId,
      userEmail: user.email ?? null,
      kind: "catalog",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      solutions: generated.length,
    });
  } catch (e) {
    console.error("[ai] falha ao registrar custo da geração:", e);
  }

  return { solutions: generated.length };
}

"use server";

import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { solutions, solutionPlans, consultants } from "@/lib/db/schema";
import type {
  CatalogSolution,
  CatalogConsultant,
  Billing,
} from "./types";
import { SEED_SOLUTIONS, SEED_CONSULTANTS } from "./seed";

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

async function writeSolution(sol: CatalogSolution, sortOrder: number) {
  await db.transaction(async (tx) => {
    const base = {
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
      .onConflictDoUpdate({ target: solutions.id, set: base });

    await tx.delete(solutionPlans).where(eq(solutionPlans.solutionId, sol.id));
    if (sol.plans.length > 0) {
      await tx.insert(solutionPlans).values(
        sol.plans.map((p, i) => ({
          id: p.id,
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
  let sols = await db
    .select()
    .from(solutions)
    .orderBy(asc(solutions.sortOrder), asc(solutions.createdAt));

  // Seed no primeiro acesso (tabela vazia).
  if (sols.length === 0) {
    for (let i = 0; i < SEED_SOLUTIONS.length; i++) {
      await writeSolution(SEED_SOLUTIONS[i], i);
    }
    sols = await db
      .select()
      .from(solutions)
      .orderBy(asc(solutions.sortOrder), asc(solutions.createdAt));
  }

  const plans = await db
    .select()
    .from(solutionPlans)
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
  await writeSolution(sol, sortOrder);
}

export async function deleteSolution(id: string): Promise<void> {
  await db.delete(solutions).where(eq(solutions.id, id)); // cascade nos planos
}

// ---------------- Consultores ----------------

export async function listConsultants(): Promise<CatalogConsultant[]> {
  let rows = await db
    .select()
    .from(consultants)
    .orderBy(asc(consultants.sortOrder), asc(consultants.createdAt));

  if (rows.length === 0) {
    await db.insert(consultants).values(
      SEED_CONSULTANTS.map((c, i) => ({ ...c, sortOrder: i })),
    );
    rows = await db
      .select()
      .from(consultants)
      .orderBy(asc(consultants.sortOrder), asc(consultants.createdAt));
  }

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
  }));
}

export async function upsertConsultant(
  c: CatalogConsultant,
  sortOrder: number,
): Promise<void> {
  const base = { name: c.name, email: c.email, phone: c.phone, sortOrder };
  await db
    .insert(consultants)
    .values({ id: c.id, ...base })
    .onConflictDoUpdate({ target: consultants.id, set: base });
}

export async function deleteConsultant(id: string): Promise<void> {
  await db.delete(consultants).where(eq(consultants.id, id));
}

"use server";

import { randomUUID } from "node:crypto";
import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { blockTemplates } from "@/lib/db/schema";
import { requireOrgId } from "@/lib/auth/org";
import { LIMITS, LimitError } from "@/lib/limits";
import type { ProposalData } from "@/lib/proposal/types";
import type { BlockTemplate, BlockKey } from "./types";
import { SEED_TEMPLATES } from "./seed";

type Row = typeof blockTemplates.$inferSelect;

function rowToTemplate(r: Row): BlockTemplate {
  return {
    id: r.id,
    block: r.block as BlockKey,
    name: r.name,
    payload: r.payload as Partial<ProposalData>,
  };
}

export async function listTemplates(): Promise<BlockTemplate[]> {
  const orgId = await requireOrgId();
  let rows = await db
    .select()
    .from(blockTemplates)
    .where(eq(blockTemplates.orgId, orgId))
    .orderBy(asc(blockTemplates.sortOrder), asc(blockTemplates.createdAt));

  if (rows.length === 0) {
    await db.insert(blockTemplates).values(
      SEED_TEMPLATES.map((t, i) => ({
        id: randomUUID(),
        orgId,
        block: t.block,
        name: t.name,
        payload: (t.payload ?? {}) as Record<string, unknown>,
        sortOrder: i,
      })),
    );
    rows = await db
      .select()
      .from(blockTemplates)
      .where(eq(blockTemplates.orgId, orgId))
      .orderBy(asc(blockTemplates.sortOrder), asc(blockTemplates.createdAt));
  }

  return rows.map(rowToTemplate);
}

export async function upsertTemplate(
  tpl: BlockTemplate,
  sortOrder: number,
): Promise<void> {
  const orgId = await requireOrgId();
  const exists = await db
    .select({ id: blockTemplates.id })
    .from(blockTemplates)
    .where(and(eq(blockTemplates.id, tpl.id), eq(blockTemplates.orgId, orgId)))
    .limit(1);
  if (exists.length === 0) {
    const [{ c }] = await db
      .select({ c: count() })
      .from(blockTemplates)
      .where(eq(blockTemplates.orgId, orgId));
    if (Number(c) >= LIMITS.templates) {
      throw new LimitError(`Limite de ${LIMITS.templates} variações atingido.`);
    }
  }
  const base = {
    orgId,
    block: tpl.block,
    name: tpl.name,
    payload: (tpl.payload ?? {}) as Record<string, unknown>,
    sortOrder,
  };
  await db
    .insert(blockTemplates)
    .values({ id: tpl.id, ...base })
    .onConflictDoUpdate({
      target: blockTemplates.id,
      set: base,
      where: eq(blockTemplates.orgId, orgId),
    });
}

export async function deleteTemplate(id: string): Promise<void> {
  const orgId = await requireOrgId();
  await db
    .delete(blockTemplates)
    .where(and(eq(blockTemplates.id, id), eq(blockTemplates.orgId, orgId)));
}

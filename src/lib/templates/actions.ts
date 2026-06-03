"use server";

import { asc } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { blockTemplates } from "@/lib/db/schema";
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
  let rows = await db
    .select()
    .from(blockTemplates)
    .orderBy(asc(blockTemplates.sortOrder), asc(blockTemplates.createdAt));

  if (rows.length === 0) {
    await db.insert(blockTemplates).values(
      SEED_TEMPLATES.map((t, i) => ({
        id: t.id,
        block: t.block,
        name: t.name,
        payload: (t.payload ?? {}) as Record<string, unknown>,
        sortOrder: i,
      })),
    );
    rows = await db
      .select()
      .from(blockTemplates)
      .orderBy(asc(blockTemplates.sortOrder), asc(blockTemplates.createdAt));
  }

  return rows.map(rowToTemplate);
}

export async function upsertTemplate(
  tpl: BlockTemplate,
  sortOrder: number,
): Promise<void> {
  const base = {
    block: tpl.block,
    name: tpl.name,
    payload: (tpl.payload ?? {}) as Record<string, unknown>,
    sortOrder,
  };
  await db
    .insert(blockTemplates)
    .values({ id: tpl.id, ...base })
    .onConflictDoUpdate({ target: blockTemplates.id, set: base });
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.delete(blockTemplates).where(eq(blockTemplates.id, id));
}

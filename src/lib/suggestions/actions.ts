"use server";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { suggestions } from "@/lib/db/schema";
import { requireUser, requireOrgId } from "@/lib/auth/org";
import { isCurrentUserAdmin } from "@/lib/admin/data";
import {
  SUGGESTION_STATUSES,
  SUGGESTION_CATEGORIES,
  type SuggestionStatus,
  type MySuggestion,
  type AdminSuggestion,
} from "./types";

const toIso = (d: Date | string | null) =>
  d == null ? null : d instanceof Date ? d.toISOString() : String(d);

async function requireAdmin() {
  if (!(await isCurrentUserAdmin())) throw new Error("Acesso restrito.");
}

// ───────────────────────── Cliente ─────────────────────────

export async function createSuggestion(input: {
  title: string;
  body: string;
  category: string;
}): Promise<void> {
  const user = await requireUser();
  const orgId = await requireOrgId();

  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 3)
    throw new Error("Dê um título com pelo menos 3 caracteres.");
  if (title.length > 140) throw new Error("Título muito longo (máx. 140).");
  if (body.length > 4000)
    throw new Error("Descrição muito longa (máx. 4000 caracteres).");

  const category = (
    SUGGESTION_CATEGORIES as readonly string[]
  ).includes(input.category)
    ? input.category
    : "melhoria";

  await db.insert(suggestions).values({
    orgId,
    userId: user.id,
    authorEmail: user.email?.toLowerCase() ?? null,
    title,
    body,
    category,
    status: "new",
  });
}

export async function listMySuggestions(): Promise<MySuggestion[]> {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(suggestions)
    .where(eq(suggestions.userId, user.id))
    .orderBy(desc(suggestions.createdAt));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    category: r.category,
    status: r.status,
    createdAt: toIso(r.createdAt),
  }));
}

// ───────────────────────── Master ─────────────────────────

export async function listAllSuggestions(): Promise<AdminSuggestion[]> {
  await requireAdmin();
  const rows = (await db.execute(sql`
    select s.id, s.title, s.body, s.category, s.status, s.admin_note,
           s.author_email, s.created_at, o.name as org_name
    from suggestions s
    left join organizations o on o.id = s.org_id
    order by s.created_at desc
  `)) as unknown as Array<{
    id: string;
    title: string;
    body: string;
    category: string;
    status: string;
    admin_note: string;
    author_email: string | null;
    created_at: Date | string | null;
    org_name: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    category: r.category,
    status: r.status,
    adminNote: r.admin_note ?? "",
    authorEmail: r.author_email,
    orgName: r.org_name,
    createdAt: toIso(r.created_at),
  }));
}

export async function setSuggestionStatus(
  id: string,
  status: SuggestionStatus,
): Promise<void> {
  await requireAdmin();
  if (!(SUGGESTION_STATUSES as readonly string[]).includes(status))
    throw new Error("Status inválido.");
  await db
    .update(suggestions)
    .set({ status, updatedAt: new Date() })
    .where(eq(suggestions.id, id));
}

export async function deleteSuggestion(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(suggestions).where(eq(suggestions.id, id));
}

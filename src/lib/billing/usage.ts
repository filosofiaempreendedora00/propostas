"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organizations } from "@/lib/db/schema";
import { requireUser, requireOrgId } from "@/lib/auth/org";
import { applyEntitlementByEmail } from "@/lib/billing/entitlement";
import { FREE_DOWNLOADS } from "@/lib/limits";

export type Usage = {
  email: string | null;
  unlimited: boolean; // assinante ativo → sem cota
  used: number;
  limit: number;
  remaining: number;
};

function pack(
  email: string | null,
  status: string | undefined,
  used: number,
): Usage {
  const unlimited = status === "active";
  return {
    email,
    unlimited,
    used,
    limit: FREE_DOWNLOADS,
    remaining: Math.max(0, FREE_DOWNLOADS - used),
  };
}

// Estado atual da cota (não incrementa) — usado para mostrar "X de 3".
export async function getUsage(): Promise<Usage> {
  const user = await requireUser();
  const orgId = await requireOrgId();
  const [org] = await db
    .select({ status: organizations.status, used: organizations.downloadsUsed })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return pack(user.email ?? null, org?.status, org?.used ?? 0);
}

// Marca o 1º download da conta (atômico, à prova de corrida) e devolve true
// SÓ para quem acabou de marcar — ou seja, uma única vez por conta, para sempre.
async function markFirstDownload(
  orgId: string,
  already: Date | string | null | undefined,
): Promise<boolean> {
  if (already) return false;
  const rows = (await db.execute(sql`
    update organizations set first_download_at = now()
    where id = ${orgId} and first_download_at is null
    returning id
  `)) as unknown as Array<{ id: string }>;
  return rows.length > 0;
}

// Registra um download: assinante = liberado; free = consome 1 da cota
// (incremento atômico condicional, à prova de corrida). allowed=false quando esgotou.
// `firstDownload` = true apenas no PRIMEIRO download bem-sucedido da conta.
export async function recordDownload(): Promise<
  { allowed: boolean; firstDownload: boolean } & Usage
> {
  const user = await requireUser();
  const orgId = await requireOrgId();
  const email = user.email ?? null;

  const [org] = await db
    .select({
      status: organizations.status,
      used: organizations.downloadsUsed,
      firstDownloadAt: organizations.firstDownloadAt,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (org?.status === "active") {
    const firstDownload = await markFirstDownload(orgId, org.firstDownloadAt);
    return { allowed: true, firstDownload, ...pack(email, "active", org.used) };
  }

  const rows = (await db.execute(sql`
    update organizations set downloads_used = downloads_used + 1
    where id = ${orgId} and downloads_used < ${FREE_DOWNLOADS}
    returning downloads_used
  `)) as unknown as Array<{ downloads_used: number }>;

  if (rows.length) {
    const firstDownload = await markFirstDownload(orgId, org?.firstDownloadAt);
    return {
      allowed: true,
      firstDownload,
      ...pack(email, org?.status, rows[0].downloads_used),
    };
  }
  return {
    allowed: false,
    firstDownload: false,
    ...pack(email, org?.status, org?.used ?? FREE_DOWNLOADS),
  };
}

// "Já assinei → liberar": reaplica o entitlement pelo e-mail e devolve o estado.
export async function refreshAccess(): Promise<Usage> {
  const user = await requireUser();
  const orgId = await requireOrgId();
  try {
    if (user.email) await applyEntitlementByEmail(user.email);
  } catch {
    /* sem assinatura ainda */
  }
  const [org] = await db
    .select({ status: organizations.status, used: organizations.downloadsUsed })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return pack(user.email ?? null, org?.status, org?.used ?? 0);
}

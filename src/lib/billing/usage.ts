"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organizations } from "@/lib/db/schema";
import { requireUser, requireOrgId } from "@/lib/auth/org";
import { applyEntitlementByEmail } from "@/lib/billing/entitlement";
import { syncBrevoContact, brevoDate } from "@/lib/integrations/brevo";
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

// Registra um download. Modelo MARCA D'ÁGUA: download é SEMPRE permitido (sem
// cap). Assinante baixa limpo; free baixa com marca d'água (watermarked=true).
// Incrementa downloads_used só pra analytics. `firstDownload` = true só no 1º.
export async function recordDownload(): Promise<
  { allowed: true; firstDownload: boolean; watermarked: boolean } & Usage
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

  const active = org?.status === "active";

  // Incrementa SEMPRE (sem cap) — só pra contagem/analytics.
  const rows = (await db.execute(sql`
    update organizations set downloads_used = downloads_used + 1
    where id = ${orgId}
    returning downloads_used
  `)) as unknown as Array<{ downloads_used: number }>;
  const used = rows[0]?.downloads_used ?? (org?.used ?? 0) + 1;
  const firstDownload = await markFirstDownload(orgId, org?.firstDownloadAt);

  // Espelha no Brevo: assinante → 'cliente'; free (marca d'água) → 'quente'.
  void syncBrevoContact(email, {
    DOWNLOADS_COUNT: used,
    LIFECYCLE_STAGE: active ? "cliente" : "quente",
    LAST_ACTIVE_AT: brevoDate(),
    ...(active ? { PLAN: "paid" as const } : {}),
  });

  return {
    allowed: true,
    firstDownload,
    watermarked: !active,
    ...pack(email, org?.status, used),
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

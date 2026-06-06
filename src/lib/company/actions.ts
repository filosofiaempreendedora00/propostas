"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { companySettings } from "@/lib/db/schema";
import { requireOrgId } from "@/lib/auth/org";
import { LIMITS, LimitError } from "@/lib/limits";

export type CompanyBrand = { logo: string | null; logoDark: string | null };

// logo = versão p/ fundo ESCURO · logoDark = versão p/ fundo CLARO
export async function getCompanyBrand(): Promise<CompanyBrand> {
  const orgId = await requireOrgId();
  const [row] = await db
    .select()
    .from(companySettings)
    .where(eq(companySettings.orgId, orgId))
    .limit(1);
  return { logo: row?.logo ?? null, logoDark: row?.logoDark ?? null };
}

export async function setCompanyLogo(
  field: "logo" | "logoDark",
  value: string | null,
): Promise<void> {
  const orgId = await requireOrgId();
  if (value && value.length > LIMITS.logoBytes) {
    throw new LimitError(
      "Logo muito grande. Use um PNG de até ~500 KB (transparente).",
    );
  }
  const [row] = await db
    .select({ id: companySettings.id })
    .from(companySettings)
    .where(eq(companySettings.orgId, orgId))
    .limit(1);
  if (row) {
    await db
      .update(companySettings)
      .set({ [field]: value, updatedAt: new Date() })
      .where(eq(companySettings.orgId, orgId));
  } else {
    // 1ª vez desta org: cria a linha (id = orgId mantém unicidade por org).
    await db
      .insert(companySettings)
      .values({ id: orgId, orgId, [field]: value, updatedAt: new Date() });
  }
}

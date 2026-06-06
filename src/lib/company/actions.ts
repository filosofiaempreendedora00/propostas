"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { companySettings } from "@/lib/db/schema";
import { requireOrgId } from "@/lib/auth/org";
import { LIMITS, LimitError } from "@/lib/limits";

export async function getCompanyLogo(): Promise<string | null> {
  const orgId = await requireOrgId();
  const [row] = await db
    .select()
    .from(companySettings)
    .where(eq(companySettings.orgId, orgId))
    .limit(1);
  return row?.logo ?? null;
}

export async function setCompanyLogo(logo: string | null): Promise<void> {
  const orgId = await requireOrgId();
  if (logo && logo.length > LIMITS.logoBytes) {
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
      .set({ logo, updatedAt: new Date() })
      .where(eq(companySettings.orgId, orgId));
  } else {
    // 1ª vez desta org: cria a linha (id = orgId mantém unicidade por org).
    await db
      .insert(companySettings)
      .values({ id: orgId, orgId, logo, updatedAt: new Date() });
  }
}

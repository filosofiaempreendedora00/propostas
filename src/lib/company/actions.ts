"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { companySettings } from "@/lib/db/schema";

const ID = "default";

export async function getCompanyLogo(): Promise<string | null> {
  const [row] = await db
    .select()
    .from(companySettings)
    .where(eq(companySettings.id, ID));
  return row?.logo ?? null;
}

export async function setCompanyLogo(logo: string | null): Promise<void> {
  await db
    .insert(companySettings)
    .values({ id: ID, logo, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: companySettings.id,
      set: { logo, updatedAt: new Date() },
    });
}

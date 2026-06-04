"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { companySettings } from "@/lib/db/schema";
import { DEFAULT_CONSULTANT_TERM } from "./terms";

const ID = "default";

export interface CompanySettings {
  logo: string | null;
  consultantTerm: string;
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const [row] = await db
    .select()
    .from(companySettings)
    .where(eq(companySettings.id, ID));
  return {
    logo: row?.logo ?? null,
    consultantTerm: row?.consultantTerm ?? DEFAULT_CONSULTANT_TERM,
  };
}

async function upsert(patch: Partial<CompanySettings>) {
  await db
    .insert(companySettings)
    .values({
      id: ID,
      logo: patch.logo ?? null,
      consultantTerm: patch.consultantTerm ?? DEFAULT_CONSULTANT_TERM,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: companySettings.id,
      set: { ...patch, updatedAt: new Date() },
    });
}

export async function setCompanyLogo(logo: string | null): Promise<void> {
  await upsert({ logo });
}

export async function setConsultantTerm(term: string): Promise<void> {
  await upsert({ consultantTerm: term });
}

"use server";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { isCurrentUserAdmin, type AccountDetail } from "./data";

// Raio-x de uma conta — soluções, consultores, planos, templates e logo reais.
// Carregado sob demanda ao expandir o lead no painel master.
export async function getAccountDetail(orgId: string): Promise<AccountDetail> {
  if (!(await isCurrentUserAdmin())) throw new Error("Acesso restrito.");

  const meta = (await db.execute(sql`
    select (u.raw_user_meta_data->>'first_name') as first,
           (u.raw_user_meta_data->>'last_name')  as last
    from organizations o join auth.users u on u.id = o.owner_id
    where o.id = ${orgId} limit 1
  `)) as unknown as Array<{ first: string | null; last: string | null }>;

  const solutions = (await db.execute(sql`
    select name, tagline from solutions where org_id = ${orgId} order by sort_order
  `)) as unknown as Array<{ name: string; tagline: string }>;

  const consultants = (await db.execute(sql`
    select name, role, email, phone from consultants where org_id = ${orgId} order by sort_order
  `)) as unknown as Array<{
    name: string;
    role: string;
    email: string;
    phone: string;
  }>;

  const [{ n: plansCount }] = (await db.execute(
    sql`select count(*)::int as n from solution_plans where org_id = ${orgId}`,
  )) as unknown as Array<{ n: number }>;

  const [{ n: templatesCount }] = (await db.execute(
    sql`select count(*)::int as n from block_templates where org_id = ${orgId}`,
  )) as unknown as Array<{ n: number }>;

  const logo = (await db.execute(sql`
    select (logo is not null and length(logo) > 100) as has_logo,
           (logo_dark is not null and length(logo_dark) > 100) as has_dark
    from company_settings where org_id = ${orgId} limit 1
  `)) as unknown as Array<{ has_logo: boolean; has_dark: boolean }>;

  const first = meta[0]?.first?.trim() ?? "";
  const last = meta[0]?.last?.trim() ?? "";
  const signupName = `${first} ${last}`.trim() || null;

  return {
    signupName,
    solutions: solutions.map((s) => ({ name: s.name, tagline: s.tagline })),
    consultants: consultants.map((c) => ({
      name: c.name,
      role: c.role,
      email: c.email,
      phone: c.phone,
    })),
    plansCount: Number(plansCount) || 0,
    templatesCount: Number(templatesCount) || 0,
    hasLogo: !!logo[0]?.has_logo,
    hasLogoDark: !!logo[0]?.has_dark,
  };
}

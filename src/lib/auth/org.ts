import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organizations, memberships } from "@/lib/db/schema";
import { createSupabaseServer } from "@/lib/supabase/server";
import { applyEntitlementToOrg } from "@/lib/billing/entitlement";

// Usuário autenticado (valida o JWT no Supabase). Lança se não houver sessão.
// Toda Server Action deve passar por aqui (defesa além do proxy).
export async function requireUser() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  return user;
}

// Org do usuário logado. Cria a organização pessoal na primeira vez
// (serializado por usuário via advisory lock, evitando corrida em cargas paralelas).
export async function requireOrgId(): Promise<string> {
  const user = await requireUser();

  // Caminho rápido (sem lock): já tem org?
  const found = await db
    .select({ id: memberships.orgId })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .orderBy(sql`case when ${memberships.role} = 'owner' then 0 else 1 end`)
    .limit(1);
  if (found.length) return found[0].id;

  // Cria a org pessoal (lock por usuário pra não duplicar).
  const orgId = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`);
    const again = await tx
      .select({ id: memberships.orgId })
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .limit(1);
    if (again.length) return again[0].id;

    const name = user.email?.split("@")[0] || "Minha empresa";
    const [org] = await tx
      .insert(organizations)
      .values({ ownerId: user.id, name, plan: "individual", seatLimit: 1 })
      .returning({ id: organizations.id });
    await tx
      .insert(memberships)
      .values({ orgId: org.id, userId: user.id, role: "owner" });
    return org.id;
  });

  // Se a pessoa já comprou (assinatura por e-mail), aplica o plano na org nova.
  try {
    await applyEntitlementToOrg(orgId, user.email);
  } catch {
    /* sem assinatura ainda — segue com o padrão */
  }
  return orgId;
}

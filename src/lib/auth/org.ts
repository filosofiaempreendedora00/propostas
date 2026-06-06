import "server-only";

import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organizations, memberships, invitations } from "@/lib/db/schema";
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

  const email = user.email?.toLowerCase() ?? null;

  // Serializado por usuário (lock) pra não duplicar org/aceitar convite 2x.
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`);
    const again = await tx
      .select({ id: memberships.orgId })
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .limit(1);
    if (again.length) return { orgId: again[0].id, created: false };

    // Tem convite pendente pra esse e-mail? Entra na equipe (se houver assento).
    if (email) {
      const [inv] = await tx
        .select()
        .from(invitations)
        .where(and(eq(invitations.email, email), isNull(invitations.acceptedAt)))
        .limit(1);
      if (inv) {
        const [o] = await tx
          .select({ seatLimit: organizations.seatLimit })
          .from(organizations)
          .where(eq(organizations.id, inv.orgId))
          .limit(1);
        const [{ c }] = await tx
          .select({ c: count() })
          .from(memberships)
          .where(eq(memberships.orgId, inv.orgId));
        if (o && Number(c) < o.seatLimit) {
          await tx
            .insert(memberships)
            .values({ orgId: inv.orgId, userId: user.id, role: inv.role })
            .onConflictDoNothing();
          await tx
            .update(invitations)
            .set({ acceptedAt: new Date() })
            .where(eq(invitations.id, inv.id));
          return { orgId: inv.orgId, created: false };
        }
      }
    }

    // Senão, cria a org pessoal.
    const name = email?.split("@")[0] || "Minha empresa";
    const [org] = await tx
      .insert(organizations)
      .values({
        ownerId: user.id,
        name,
        plan: "individual",
        seatLimit: 1,
        status: "inactive", // sem acesso até uma assinatura ativar (paywall)
      })
      .returning({ id: organizations.id });
    await tx
      .insert(memberships)
      .values({ orgId: org.id, userId: user.id, role: "owner" });
    return { orgId: org.id, created: true };
  });

  // Só aplica assinatura própria quando é org pessoal recém-criada.
  if (result.created) {
    try {
      await applyEntitlementToOrg(result.orgId, user.email);
    } catch {
      /* sem assinatura ainda */
    }
  }
  return result.orgId;
}

// Org atual completa (cria na 1ª vez). Usado pra checar acesso (paywall).
export async function getCurrentOrg() {
  const orgId = await requireOrgId();
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return org;
}

// Tem acesso = assinatura ativa.
export async function hasActiveAccess(): Promise<boolean> {
  const org = await getCurrentOrg();
  return org?.status === "active";
}

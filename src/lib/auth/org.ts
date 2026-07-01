import "server-only";

import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organizations, memberships, invitations } from "@/lib/db/schema";
import { createSupabaseServer } from "@/lib/supabase/server";
import { applyEntitlementToOrg } from "@/lib/billing/entitlement";
import { FREE_DOWNLOADS } from "@/lib/limits";
import { addLeadToBrevo } from "@/lib/integrations/brevo";
import { cookies } from "next/headers";

// Atribuição do lead a partir dos cookies (setados na 1ª visita pelo
// AttributionCapture; persistem até o cadastro): IDs de clique crus
// (gclid/fbclid, p/ conversão offline), a 1ª URL de entrada (com UTMs) e a
// origem derivada 'google' | 'meta' | 'direct'. Fallback: os próprios cookies
// dos pixels (_fbc do Meta, _gcl_aw do Google).
type Acquisition = {
  source: "google" | "meta" | "direct";
  gclid: string | null;
  fbclid: string | null;
  firstUrl: string | null;
};
async function detectAcquisition(): Promise<Acquisition> {
  const empty: Acquisition = {
    source: "direct",
    gclid: null,
    fbclid: null,
    firstUrl: null,
  };
  try {
    const c = await cookies();
    const get = (n: string) => c.get(n)?.value || "";
    const dec = (v: string) => {
      try {
        return v ? decodeURIComponent(v) : "";
      } catch {
        return v;
      }
    };

    let gclid = dec(get("kronos_gclid"));
    let fbclid = dec(get("kronos_fbclid"));
    // Fallback: extrai o ID de dentro do cookie do próprio pixel.
    // _fbc = "fb.1.<timestamp>.<fbclid>" · _gcl_aw = "GA1.1.<gclid>".
    if (!fbclid) {
      const parts = get("_fbc").split(".");
      if (parts.length >= 4) fbclid = parts.slice(3).join(".");
    }
    if (!gclid) {
      const parts = get("_gcl_aw").split(".");
      if (parts.length >= 3) gclid = parts.slice(2).join(".");
    }

    const firstUrl = dec(get("kronos_first_url"));
    // utm_source da 1ª URL de entrada (fallback quando não veio click-id).
    let utm = "";
    try {
      if (firstUrl) {
        utm = (
          new URL(firstUrl, "http://x").searchParams.get("utm_source") || ""
        ).toLowerCase();
      }
    } catch {
      /* URL malformada → ignora */
    }

    // Origem derivada, na ordem de confiança: click-id > utm > cookie do pixel.
    let source: Acquisition["source"] = "direct";
    if (gclid) source = "google";
    else if (fbclid) source = "meta";
    else if (/goog|adwords|gads/.test(utm)) source = "google";
    else if (/face|meta|insta|ig\b|fb/.test(utm)) source = "meta";
    else if (get("_gcl_aw")) source = "google";
    else if (get("_fbc")) source = "meta";

    return {
      source,
      gclid: gclid || null,
      fbclid: fbclid || null,
      firstUrl: firstUrl || null,
    };
  } catch {
    return empty;
  }
}

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
  const acq = await detectAcquisition(); // origem + gclid/fbclid do anúncio, se houver

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
        status: "free", // freemium: entra com cota grátis; assina p/ liberar ilimitado
        acquisitionSource: acq.source, // google | meta | direct
        acquisitionGclid: acq.gclid,
        acquisitionFbclid: acq.fbclid,
        acquisitionFirstUrl: acq.firstUrl,
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
    // Cadastro novo → entra na lista do Brevo (dispara as boas-vindas).
    // Cobre e-mail e Google; fire-and-forget (não bloqueia/quebra o acesso).
    if (user.email) {
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const str = (...keys: string[]) => {
        for (const k of keys) {
          const v = meta[k];
          if (typeof v === "string" && v.trim()) return v.trim();
        }
        return null;
      };
      const full = str("full_name", "name");
      void addLeadToBrevo({
        email: user.email,
        firstName: str("first_name", "given_name") ?? full?.split(" ")[0] ?? null,
        lastName:
          str("last_name", "family_name") ??
          full?.split(" ").slice(1).join(" ") ??
          null,
      });
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

// Estado de acesso freemium: assinante, em teste (com cota) ou travado (esgotou).
// `locked` = não-assinante que já usou os downloads grátis → preso em /planos.
export async function getAccessState(): Promise<{
  active: boolean;
  used: number;
  limit: number;
  remaining: number;
  locked: boolean;
}> {
  const org = await getCurrentOrg();
  const active = org?.status === "active";
  const used = org?.downloadsUsed ?? 0;
  return {
    active,
    used,
    limit: FREE_DOWNLOADS,
    remaining: Math.max(0, FREE_DOWNLOADS - used),
    locked: !active && used >= FREE_DOWNLOADS,
  };
}

import { type NextRequest, NextResponse, userAgent } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { funnelEvents, memberships } from "@/lib/db/schema";
import { createSupabaseServer } from "@/lib/supabase/server";

// Ingestão de eventos de funil (instrumentação do caminho, não só do resultado).
// Chamado via navigator.sendBeacon do trackFunnel() no cliente. Regras de ouro:
//   · device derivado no SERVIDOR pelo User-Agent (confiável, ≠ do cliente)
//   · org_id resolvido no SERVIDOR pela sessão (nunca confiar no cliente); não cria org
//   · fire-and-forget: qualquer erro de tracking é engolido — SEMPRE responde 204,
//     nunca quebra navegação nem vaza erro pro usuário
export const runtime = "nodejs"; // usa o driver postgres-js (Node), não Edge

const ok = () => new NextResponse(null, { status: 204 });

// mobile | tablet | desktop — device.type vem 'mobile'|'tablet'|'console'|... ou
// undefined (navegador desktop). Tudo que não é mobile/tablet cai em desktop.
function deviceOf(req: NextRequest): "mobile" | "tablet" | "desktop" {
  const t = userAgent(req).device.type;
  if (t === "mobile") return "mobile";
  if (t === "tablet") return "tablet";
  return "desktop";
}

// Org da sessão, se houver — SÓ leitura, nunca cria (≠ requireOrgId). Null se
// deslogado (evento de topo de funil, pré-login).
async function resolveOrgId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const rows = await db
      .select({ id: memberships.orgId })
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .orderBy(sql`case when ${memberships.role} = 'owner' then 0 else 1 end`)
      .limit(1);
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

const str = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export async function POST(req: NextRequest) {
  try {
    // Corpo do sendBeacon (Blob application/json). Parse defensivo.
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      try {
        body = JSON.parse(await req.text());
      } catch {
        return ok(); // corpo ilegível → não trava, só ignora
      }
    }

    const event = str(body.event, 64);
    if (!event) return ok(); // sem evento não há o que registrar

    const params =
      body.params && typeof body.params === "object" && !Array.isArray(body.params)
        ? (body.params as Record<string, unknown>)
        : null;

    const orgId = await resolveOrgId();

    await db.insert(funnelEvents).values({
      orgId,
      anonId: str(body.anon_id, 64),
      event,
      device: deviceOf(req),
      path: str(body.path, 512),
      params: params ?? undefined,
    });
  } catch {
    /* tracking NUNCA quebra a request */
  }
  return ok();
}

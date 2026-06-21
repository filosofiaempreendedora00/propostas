import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { billingCustomers } from "@/lib/db/schema";
import { parseKiwify, planForProduct } from "@/lib/billing/kiwify";
import { applyEntitlementByEmail } from "@/lib/billing/entitlement";

// Webhook da Kiwify: libera/bloqueia acesso automaticamente.
// Segurança: segredo na URL (?secret=...) que só a Kiwify conhece.
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== process.env.KIWIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Parse defensivo (json / form / texto).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {};
  const ct = request.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      body = await request.json();
    } else if (ct.includes("form")) {
      const f = await request.formData();
      body = Object.fromEntries(f.entries());
    } else {
      const t = await request.text();
      try {
        body = JSON.parse(t);
      } catch {
        body = { raw: t };
      }
    }
  } catch {
    /* corpo vazio/ilegível */
  }

  // Log pra inspecionar o formato real (aparece nos logs da Vercel).
  console.log("[kiwify webhook]", JSON.stringify(body).slice(0, 2000));

  const parsed = parseKiwify(body);
  if (!parsed.email) {
    // 200 mesmo assim pra Kiwify não ficar reenviando.
    return NextResponse.json({ ok: true, note: "sem email no payload" });
  }

  // Carrinho abandonado, pagamento pendente, recusado, evento desconhecido:
  // não é cliente — não registramos nada (evita falsos "cancelados" no painel).
  if (parsed.outcome === "ignore") {
    return NextResponse.json({ ok: true, note: "evento não-cliente ignorado" });
  }

  const { plan, seatLimit } = planForProduct(parsed.productId, parsed.productName);
  const status = parsed.outcome === "active" ? "active" : "canceled";
  const set = {
    plan,
    seatLimit,
    status,
    provider: "kiwify",
    productId: parsed.productId ?? undefined,
    subscriptionId: parsed.subscriptionId ?? undefined,
    raw: body,
    updatedAt: new Date(),
  };

  await db
    .insert(billingCustomers)
    .values({ email: parsed.email, ...set })
    .onConflictDoUpdate({ target: billingCustomers.email, set });

  // Se a pessoa já tem conta, aplica a assinatura na org dela agora.
  try {
    await applyEntitlementByEmail(parsed.email);
  } catch (e) {
    console.error("[kiwify webhook] applyEntitlement falhou:", e);
  }

  return NextResponse.json({ ok: true, plan, status });
}

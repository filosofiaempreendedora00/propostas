import "server-only";

// Mapa: produto da Kiwify → plano/assentos.
const PRODUCTS: Record<string, { plan: string; seatLimit: number }> = {
  "2516e2c0-5ee3-11f1-b6c3-5d02cfeb6605": { plan: "individual", seatLimit: 1 },
  "2d950500-6143-11f1-adec-45b26bfa8fc5": { plan: "time", seatLimit: 10 },
};

// "active"   = compra/renovação aprovada → liberar acesso
// "canceled" = reembolso/chargeback/cancelamento/atraso → bloquear
// "ignore"   = não é cliente (carrinho abandonado, pagamento pendente, recusado…)
//              → não registrar como assinante nenhum
export type KiwifyOutcome = "active" | "canceled" | "ignore";

export type ParsedKiwify = {
  email: string | null;
  productId: string | null;
  productName: string | null;
  subscriptionId: string | null;
  outcome: KiwifyOutcome;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const pick = (...vals: Any[]): Any =>
  vals.find((v) => v !== undefined && v !== null && v !== "");

// Extrai os campos de um payload da Kiwify de forma defensiva (o formato varia
// entre eventos). O webhook também loga o payload cru pra ajustarmos se preciso.
export function parseKiwify(body: Any): ParsedKiwify {
  const emailRaw = pick(
    body?.Customer?.email,
    body?.customer?.email,
    body?.customer_email,
    body?.buyer?.email,
    body?.email,
  );
  const productId = pick(
    body?.Product?.product_id,
    body?.Product?.id,
    body?.product_id,
    body?.product?.id,
  );
  const productName = pick(
    body?.Product?.product_name,
    body?.Product?.name,
    body?.product_name,
    body?.product?.name,
  );
  const subscriptionId = pick(
    body?.Subscription?.id,
    body?.subscription_id,
    body?.subscription?.id,
  );

  const statusStr = String(
    pick(
      body?.order_status,
      body?.subscription_status,
      body?.Subscription?.status,
      body?.status,
      body?.webhook_event_type,
      body?.event,
    ) ?? "",
  ).toLowerCase();

  const ACTIVE = [
    "paid",
    "approved",
    "active",
    "renewed",
    "aprovado",
    "ativo",
    "authorized",
    "completed",
    "trialing",
  ];
  // Cancelamentos REAIS (a pessoa foi cliente e deixou de ser).
  const CANCEL = [
    "refunded",
    "canceled",
    "cancelled",
    "chargeback",
    "expired",
    "past_due",
    "reembolsado",
    "cancelado",
    "atrasado",
  ];

  // Classificação conservadora: aprovado → active; cancelamento real → canceled;
  // qualquer outra coisa (abandoned, waiting_payment, pix/boleto gerado, recusado,
  // evento desconhecido) → ignore, pra não poluir o painel com "cancelados" que
  // nunca compraram.
  let outcome: KiwifyOutcome = "ignore";
  if (ACTIVE.some((w) => statusStr.includes(w))) outcome = "active";
  else if (CANCEL.some((w) => statusStr.includes(w))) outcome = "canceled";

  return {
    email: emailRaw ? String(emailRaw).toLowerCase().trim() : null,
    productId: productId ? String(productId) : null,
    productName: productName ? String(productName) : null,
    subscriptionId: subscriptionId ? String(subscriptionId) : null,
    outcome,
  };
}

// Plano a partir do produto (por id; cai pro nome se o id não bater).
export function planForProduct(
  productId: string | null,
  productName: string | null,
): { plan: string; seatLimit: number } {
  if (productId && PRODUCTS[productId]) return PRODUCTS[productId];
  const n = (productName ?? "").toLowerCase();
  if (n.includes("time")) return { plan: "time", seatLimit: 10 };
  return { plan: "individual", seatLimit: 1 };
}

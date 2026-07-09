import "server-only";

// Lista "Kronos - Leads" no Brevo (configurável por env).
const LIST_ID = Number(process.env.BREVO_LIST_ID) || 5;

// Estágio do ciclo de vida do lead — a "temperatura" que as automações do Brevo
// segmentam. Escada monótona: cadastrou (frio) → gerou catálogo real (morno) →
// baixou proposta (quente) → virou assinante (cliente). Sempre derivamos do
// estado REAL no Supabase (fonte da verdade); o Brevo é só espelho.
export type BrevoLifecycle = "frio" | "morno" | "quente" | "cliente";
export function brevoLifecycle(
  status: string | null | undefined,
  downloadsUsed: number,
  hasCatalog: boolean,
): BrevoLifecycle {
  if (status === "active") return "cliente"; // assinante pago
  if (downloadsUsed >= 1) return "quente"; // baixou ao menos 1 proposta
  if (hasCatalog) return "morno"; // gerou catálogo real
  return "frio"; // só cadastrou
}

// Data no formato aceito pelos atributos DATE do Brevo (YYYY-MM-DD).
export function brevoDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// Espelha atributos do usuário no contato do Brevo (upsert idempotente).
// Server-only e à prova de erro: NUNCA bloqueia a ação do usuário — se o Brevo
// cair, só loga. Os atributos precisam existir no Brevo (o Brevo ignora chave
// desconhecida); use as chaves em MAIÚSCULO (é como o Brevo armazena os nomes).
export async function syncBrevoContact(
  email: string | null | undefined,
  attributes: Record<string, string | number | boolean>,
): Promise<void> {
  const key = process.env.BREVO_API_KEY;
  const e = email?.trim().toLowerCase();
  if (!key || !e || Object.keys(attributes).length === 0) return;

  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": key,
        "content-type": "application/json",
        accept: "application/json",
      },
      // updateEnabled: já existe → atualiza; não existe → cria (sem lista, pra
      // não redisparar a automação de boas-vindas — quem cria + lista é o
      // addLeadToBrevo no cadastro).
      body: JSON.stringify({ email: e, attributes, updateEnabled: true }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[brevo] sync falhou:", res.status, body.slice(0, 200));
    }
  } catch (err) {
    console.error("[brevo] sync erro de rede:", err);
  }
}

// Adiciona/atualiza o lead como contato no Brevo e o coloca na lista de leads.
// Entrar na lista é o gatilho da automação de boas-vindas no Brevo.
// Não-bloqueante e à prova de erro: NUNCA pode quebrar o cadastro/login.
export async function addLeadToBrevo(opts: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<void> {
  const key = process.env.BREVO_API_KEY;
  const email = opts.email?.trim().toLowerCase();
  if (!key || !email) return; // sem chave (dev local) ou sem e-mail → no-op

  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": key,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        email,
        // Conta Brevo em PT usa NOME/SOBRENOME; mandamos FIRSTNAME/LASTNAME
        // também por robustez (o Brevo ignora atributo que não existe).
        attributes: {
          NOME: opts.firstName ?? "",
          SOBRENOME: opts.lastName ?? "",
          FIRSTNAME: opts.firstName ?? "",
          LASTNAME: opts.lastName ?? "",
        },
        listIds: [LIST_ID],
        updateEnabled: true, // idempotente: já existe → atualiza e garante na lista
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[brevo] addLead falhou:", res.status, body.slice(0, 200));
    }
  } catch (e) {
    console.error("[brevo] addLead erro de rede:", e);
  }
}

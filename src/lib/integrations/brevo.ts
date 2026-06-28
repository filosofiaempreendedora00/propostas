import "server-only";

// Lista "Kronos - Leads" no Brevo (configurável por env).
const LIST_ID = Number(process.env.BREVO_LIST_ID) || 5;

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

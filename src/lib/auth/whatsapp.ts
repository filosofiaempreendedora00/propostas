"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/org";
import { addLeadToBrevo } from "@/lib/integrations/brevo";

// Salva o WhatsApp do usuário logado que ainda não tinha (ex.: quem entrou pelo
// Google e pulou o formulário de cadastro). Atualiza o metadata do Supabase e
// sincroniza no Brevo. Preencher o número = opt-in (pode contatar).
export async function saveWhatsapp(
  raw: string,
): Promise<{ ok: boolean; error?: string }> {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) {
    return { ok: false, error: "Informe seu WhatsApp com DDD (ex: (11) 99999-8888)." };
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sessão expirada. Entre de novo." };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({
    data: { whatsapp: digits },
  });
  if (error) {
    return { ok: false, error: "Não consegui salvar agora. Tente de novo." };
  }

  // Sincroniza no Brevo (mantém nome se já existir; fire-and-forget, não quebra).
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (...keys: string[]) => {
    for (const k of keys) {
      const v = meta[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  };
  if (user.email) {
    void addLeadToBrevo({
      email: user.email,
      firstName: str("first_name", "given_name"),
      lastName: str("last_name", "family_name"),
      whatsapp: digits,
    });
  }

  return { ok: true };
}

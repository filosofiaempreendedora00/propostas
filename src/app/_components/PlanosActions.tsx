"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refreshAccess } from "@/lib/billing/usage";

// Ações no rodapé da tela de planos.
// - "Continuar testando": volta ao app SÓ se ainda houver cota grátis (não mente).
// - "Já assinei": verifica a assinatura de verdade; só entra se estiver ativa.
export default function PlanosActions({
  email,
  locked,
  remaining,
}: {
  email: string | null;
  locked: boolean;
  remaining: number;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const verify = async () => {
    setChecking(true);
    setMsg(null);
    try {
      const u = await refreshAccess();
      if (u.unlimited) {
        router.push("/inicio");
        router.refresh();
        return;
      }
      setMsg(
        "Ainda não encontramos sua assinatura. Se você acabou de assinar, aguarde ~1 minuto e tente de novo — use o mesmo e-mail da compra.",
      );
    } catch {
      setMsg("Não consegui verificar agora. Tente novamente em instantes.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mt-8 flex flex-col items-center gap-3 text-center">
      {!locked && (
        <a
          href="/inicio"
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90"
        >
          ← Continuar testando
          {remaining > 0
            ? ` · ${remaining} grátis ${remaining === 1 ? "restante" : "restantes"}`
            : ""}
        </a>
      )}

      <button
        type="button"
        onClick={verify}
        disabled={checking}
        className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink-soft transition hover:border-accent/60 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {checking ? "Verificando…" : "Já assinei — entrar"}
      </button>

      {msg && (
        <p className="max-w-sm rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[13px] text-amber-300">
          {msg}
        </p>
      )}

      <p className="text-[11px] text-ink-mute">
        Use o mesmo e-mail da compra: <strong>{email}</strong>.
      </p>
      <form action="/auth/signout" method="post">
        <button type="submit" className="text-[11px] text-accent hover:underline">
          Trocar conta
        </button>
      </form>
    </div>
  );
}

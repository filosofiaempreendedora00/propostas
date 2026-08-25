"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveWhatsapp } from "@/lib/auth/whatsapp";

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Passo obrigatório de WhatsApp pra quem não tem número (ex.: cadastro pelo
// Google, que pula o formulário). Bloqueia o app até confirmar. Preencher =
// opt-in. Aparece só quando o layout detecta que falta o número.
export default function WhatsappGate() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Informe seu WhatsApp com DDD (ex: (11) 99999-8888).");
      return;
    }
    setLoading(true);
    const res = await saveWhatsapp(phone);
    if (!res.ok) {
      setError(res.error ?? "Não consegui salvar. Tente de novo.");
      setLoading(false);
      return;
    }
    // Metadata atualizado → refresh faz o gate sumir. Mantém o loading até lá.
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="cream w-full max-w-md rounded-2xl border border-line bg-bg p-6 shadow-2xl">
        <div className="mb-3 flex items-center gap-2 text-[#25D366]">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-7 w-7">
            <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.6.2-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.3 0-.5s-.6-1.6-.9-2.2c-.2-.5-.4-.4-.6-.5h-.5c-.2 0-.5.1-.7.3-1 .9-1.2 2-1.1 3.3.4 2 1.5 3.4 3.2 4.8 2.4 2 3.9 2.2 4.8 2.2.6 0 1.9-.5 2.2-1.2.3-.7.3-1.3.2-1.4-.1-.2-.3-.2-.6-.4Z" />
            <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-2.9.9.9-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Falta só o seu WhatsApp
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-mute">
          Pra liberar seu acesso e a gente poder te dar suporte, confirme seu
          WhatsApp. É rapidinho.
        </p>
        <form onSubmit={submit} className="mt-4">
          <input
            type="tel"
            required
            inputMode="numeric"
            autoFocus
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="Seu WhatsApp com DDD"
            className="w-full rounded-xl border border-field-line bg-field px-4 py-3 text-[15px] text-field-ink outline-none transition placeholder:text-field-mute focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          {error && (
            <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-3 flex w-full cursor-pointer items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Salvando…" : "Confirmar e continuar"}
          </button>
        </form>
        <p className="mt-3 text-center text-[11.5px] leading-relaxed text-ink-mute">
          Ao confirmar, você concorda com os{" "}
          <Link
            href="/termos"
            target="_blank"
            className="font-medium text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Termos
          </Link>{" "}
          e a{" "}
          <Link
            href="/politica-de-privacidade"
            target="_blank"
            className="font-medium text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Política de Privacidade
          </Link>
          , e autoriza o contato pelo WhatsApp.
        </p>
      </div>
    </div>
  );
}

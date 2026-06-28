"use client";

import { useState } from "react";
import { generateAndReplaceCatalog } from "@/lib/catalog/actions";
import KronosLoader from "./KronosLoader";

const EXAMPLE =
  "Ex: Sou uma agência de marketing para clínicas odontológicas. Faço gestão de tráfego pago (Google e Meta), criação de conteúdo e otimização de perfil. Ticket entre R$ 1.500 e R$ 5.000/mês.";

// Botão + modal: o usuário descreve o negócio e a IA gera o catálogo completo
// (soluções + planos + consultor), substituindo o catálogo atual. O resultado
// cai nos campos editáveis normais para o usuário revisar antes de gerar proposta.
export default function AiCatalogGenerator({
  onGenerated,
}: {
  onGenerated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (loading) return;
    setOpen(false);
    setError(null);
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      await generateAndReplaceCatalog(brief);
      setOpen(false);
      setBrief("");
      onGenerated();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não consegui gerar agora. Tente de novo.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/15"
      >
        ✨ Gerar catálogo com IA
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="cream w-full max-w-lg rounded-2xl border border-line bg-bg p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {loading ? (
              <div className="py-6">
                <KronosLoader label="Gerando seu catálogo…" />
                <p className="mt-2 text-center text-xs text-ink-mute">
                  Escrevendo soluções, planos e diferenciais no tom do seu nicho.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                  Geração por IA
                </div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                  Descreva seu negócio
                </h2>
                <p className="mt-1.5 text-sm text-ink-mute">
                  Em um parágrafo: o que você vende, para quem, principais
                  serviços e faixa de preço. A IA monta seu catálogo completo —
                  você revisa e ajusta tudo depois.
                </p>

                <textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  autoFocus
                  placeholder={EXAMPLE}
                  className="mt-4 w-full resize-none rounded-xl border border-line bg-panel-2 px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-ink-mute/70 focus:border-accent/70"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-ink-mute">
                  <span>{brief.trim().length < 20 ? "Conte um pouco mais…" : "Pronto para gerar."}</span>
                  <span>{brief.length}/2000</span>
                </div>

                <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700">
                  ⚠️ Isto <strong>substitui</strong> seu catálogo atual pelo
                  gerado. Você poderá revisar e editar tudo nos campos normais
                  antes de gerar uma proposta.
                </p>

                {error && (
                  <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-600">
                    {error}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-ink-mute transition hover:text-ink"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={generate}
                    disabled={brief.trim().length < 20}
                    className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Gerar catálogo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

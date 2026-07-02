"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  generateAndReplaceCatalog,
  getAiGenerationsLeft,
} from "@/lib/catalog/actions";
import { trackFunnel } from "@/lib/analytics/google";
import KronosLoader from "./KronosLoader";

const EXAMPLE =
  "Ex: Sou uma agência de marketing para clínicas odontológicas. Faço gestão de tráfego pago (Google e Meta), criação de conteúdo e otimização de perfil. Ticket entre R$ 1.500 e R$ 5.000/mês.";

type Left = { used: number; limit: number; remaining: number };

// Botão + modal: o usuário descreve o negócio e a IA gera o catálogo completo
// (soluções + planos + consultor), substituindo o catálogo atual. Limite de
// gerações por conta; barra de progresso com estimativa durante a geração.
export default function AiCatalogGenerator({
  onGenerated,
}: {
  onGenerated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false); // sucesso → CTA pro Gerador
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<Left | null>(null);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ao abrir, busca quantas gerações ainda restam (mostra "X de 3").
  useEffect(() => {
    if (!open) return;
    getAiGenerationsLeft()
      .then(setLeft)
      .catch(() => setLeft(null));
  }, [open]);

  // Limpa o timer da barra se o componente desmontar no meio.
  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const close = () => {
    if (loading) return;
    setOpen(false);
    setError(null);
    setDone(false);
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    setProgress(0);
    trackFunnel("business_described", { via: "empresa", chars: brief.trim().length });

    // Barra FIEL ao tempo real: curva assintótica calibrada para ~1 minuto (a
    // geração varia ~25-70s). Avança o tempo todo com base no tempo decorrido
    // (não é aleatória) e NUNCA chega a 100% sozinha — só ao receber o
    // resultado. Sem número de segundos, pra não prometer um tempo que pode
    // não bater e frustrar.
    const start = performance.now();
    timer.current = setInterval(() => {
      const s = (performance.now() - start) / 1000;
      setProgress(Math.min(94, (1 - Math.exp(-s / 26)) * 100));
    }, 150);

    try {
      const res = await generateAndReplaceCatalog(brief);
      if (timer.current) clearInterval(timer.current);
      trackFunnel("catalog_generated", { via: "empresa", solutions: res.solutions });
      setProgress(100); // completa a barra visualmente
      await new Promise((r) => setTimeout(r, 350));
      setBrief("");
      onGenerated();
      // NÃO fecha mudo: mostra o sucesso + CTA pro próximo passo (Gerador).
      setDone(true);
    } catch (e) {
      if (timer.current) clearInterval(timer.current);
      setError(
        e instanceof Error
          ? e.message
          : "Não consegui gerar agora. Tente de novo.",
      );
    } finally {
      setLoading(false);
    }
  };

  const noneLeft = left?.remaining === 0;
  const tooShort = brief.trim().length < 20;

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
            {done ? (
              /* Sucesso → próximo passo ÓBVIO: gerar a proposta (sem beco). */
              <div className="py-4 text-center">
                <div className="text-4xl" aria-hidden>
                  ✅
                </div>
                <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">
                  Catálogo pronto!
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-mute">
                  Soluções, planos e textos escritos no tom do seu nicho. Agora
                  é montar a proposta — ela já sai pronta pra baixar.
                </p>
                <Link
                  href="/cliente?bemvindo=1"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg transition hover:opacity-90"
                >
                  Gerar minha proposta →
                </Link>
                <button
                  type="button"
                  onClick={close}
                  className="mt-2 w-full cursor-pointer rounded-lg px-4 py-2 text-[13px] font-medium text-ink-mute transition hover:text-ink"
                >
                  Revisar o catálogo primeiro
                </button>
              </div>
            ) : loading ? (
              <div className="py-6">
                <KronosLoader label="Gerando seu catálogo…" />

                {/* Barra de progresso (sem número de segundos, fiel ao tempo) */}
                <div className="mx-auto mt-5 max-w-xs">
                  <div className="h-2 overflow-hidden rounded-full bg-panel-2">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${progress}%`,
                        transition: "width 0.3s ease-out",
                      }}
                    />
                  </div>
                </div>

                <p className="mt-3 text-center text-xs text-ink-mute">
                  Escrevendo soluções, planos e diferenciais no tom do seu nicho
                  — leva alguns instantes.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                  Geração por IA
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                    Descreva seu negócio
                  </h2>
                  {left && (
                    <span className="shrink-0 rounded-full border border-line bg-panel-2 px-2.5 py-0.5 text-[11px] font-medium text-ink-mute">
                      {left.remaining} de {left.limit} gerações
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-ink-mute">
                  Em um parágrafo: o que você vende, para quem, principais
                  serviços e faixa de preço.{" "}
                  <strong className="text-ink-soft">
                    Quanto mais detalhes, melhor o resultado.
                  </strong>
                </p>

                {noneLeft ? (
                  <p className="mt-4 rounded-xl border border-line bg-panel-2 px-3.5 py-3 text-sm text-ink-soft">
                    Você já usou suas {left?.limit} gerações por IA. Sem problema
                    — agora é só <strong>editar e revisar</strong> seu catálogo
                    nos campos normais. É rápido e você ajusta tudo.
                  </p>
                ) : (
                  <>
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
                      <span>
                        {tooShort ? "Conte um pouco mais…" : "Pronto para gerar."}
                      </span>
                      <span>{brief.length}/2000</span>
                    </div>

                    <p className="mt-3 rounded-lg border border-accent/25 bg-accent/[0.07] px-3 py-2 text-[12px] text-ink-soft">
                      😌 Não precisa ficar perfeito de primeira — depois você{" "}
                      <strong>edita e revisa tudo</strong> nos campos normais
                      (nomes, textos, preços…). Fica fácil.
                    </p>

                    <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700">
                      ⚠️ Isto <strong>substitui</strong> seu catálogo atual pelo
                      gerado.
                    </p>
                  </>
                )}

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
                    {noneLeft ? "Fechar" : "Cancelar"}
                  </button>
                  {!noneLeft && (
                    <button
                      type="button"
                      onClick={generate}
                      disabled={tooShort}
                      className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Gerar catálogo
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

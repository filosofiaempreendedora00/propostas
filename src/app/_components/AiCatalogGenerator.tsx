"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

// Tamanho legível do arquivo anexado (ex.: "312 KB", "1,4 MB").
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

// Botão + modal: o usuário sobe um arquivo do negócio (ou descreve) e a IA gera o
// catálogo completo (soluções + planos + consultor), substituindo o catálogo
// atual. Limite de gerações por conta; barra de progresso durante a geração.
export default function AiCatalogGenerator({
  onGenerated,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  onGenerated: () => void;
  /** Modo controlado: abre/fecha de fora (ex.: card 1 do /inicio). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Esconde o botão-âncora interno (quem dispara é o pai). */
  hideTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };
  const [mounted, setMounted] = useState(false); // portal só depois de montar (SSR-safe)
  const [brief, setBrief] = useState("");
  const [showDescribe, setShowDescribe] = useState(false); // "ou descreva" recolhido
  const [pendingFile, setPendingFile] = useState<File | null>(null); // anexado, aguardando OK
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

  // Portal precisa do document (client). Marca montado após a hidratação.
  useEffect(() => setMounted(true), []);

  // Trava o scroll do fundo enquanto o modal está aberto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => {
    if (loading) return;
    setOpen(false);
    setError(null);
    setDone(false);
    setShowDescribe(false);
    setPendingFile(null);
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

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Sobe um arquivo do negócio (PDF/DOCX/TXT) → a IA extrai e cria o catálogo.
  // Mesmo destino/sucesso do fluxo digitado; barra e erro iguais.
  const sendFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    trackFunnel("business_described", {
      via: "empresa_file",
      ext: file.name.split(".").pop()?.toLowerCase() ?? "",
    });
    const start = performance.now();
    timer.current = setInterval(() => {
      const s = (performance.now() - start) / 1000;
      setProgress(Math.min(94, (1 - Math.exp(-s / 26)) * 100));
    }, 150);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch("/api/catalog/from-file", { method: "POST", body: fd });
      const data = (await resp.json().catch(() => ({}))) as {
        solutions?: number;
        error?: string;
      };
      if (timer.current) clearInterval(timer.current);
      if (!resp.ok) {
        throw new Error(data?.error || "Não consegui processar o arquivo. Tente de novo.");
      }
      trackFunnel("catalog_generated", {
        via: "empresa_file",
        solutions: data.solutions ?? 0,
      });
      setProgress(100);
      await new Promise((r) => setTimeout(r, 350));
      onGenerated();
      setDone(true);
    } catch (e) {
      if (timer.current) clearInterval(timer.current);
      setError(e instanceof Error ? e.message : "Falha ao enviar. Tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  const noneLeft = left?.remaining === 0;
  const tooShort = brief.trim().length < 20;

  return (
    <>
      {/* keyframes locais: borda tracejada em movimento ("marching ants") — a
          mesma linguagem viva da demo do /inicio, aplicada à zona de upload. */}
      <style>{`@keyframes catAnts{to{stroke-dashoffset:-36}}`}</style>

      {/* Botão-âncora do /empresa: CTA principal. No /inicio ele é escondido
          (quem abre o modal é o card 1). */}
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg shadow-[0_12px_26px_-16px_rgba(120,90,40,0.85)] transition hover:opacity-95"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
            className="h-4 w-4 transition-transform group-hover:scale-110"
          >
            <path d="M12 2c0 5-5 10-10 10 5 0 10 5 10 10 0-5 5-10 10-10-5 0-10-5-10-10z" />
          </svg>
          Gerar catálogo com IA
        </button>
      )}

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={close}
          >
          <div
            className="cream max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-bg p-5 shadow-2xl sm:p-6"
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
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                      Geração por IA
                    </div>
                    {/* Reasseguro discreto ("não precisa ficar perfeito") escondido
                        num "i" — só aparece no hover, pra não poluir. */}
                    <span className="group/info relative inline-flex">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                        tabIndex={0}
                        className="h-4 w-4 cursor-help text-ink-mute/70 outline-none transition hover:text-accent focus:text-accent"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                      <span className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-64 rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-soft opacity-0 shadow-xl transition-opacity duration-150 group-hover/info:opacity-100 group-focus-within/info:opacity-100">
                        Não precisa ficar perfeito de primeira — depois você{" "}
                        <strong className="text-ink">edita e revisa tudo</strong>{" "}
                        nos campos normais (nomes, textos, preços…). Fica fácil.
                      </span>
                    </span>
                  </div>
                  {left && (
                    <span className="shrink-0 rounded-full border border-line bg-panel-2 px-2.5 py-0.5 text-[11px] font-medium text-ink-mute">
                      {left.remaining} de {left.limit} gerações
                    </span>
                  )}
                </div>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
                  Gerar catálogo com IA
                </h2>

                {noneLeft ? (
                  <p className="mt-4 rounded-xl border border-line bg-panel-2 px-3.5 py-3 text-sm text-ink-soft">
                    Você já gerou {left?.limit} catálogos por IA nas últimas 24h.
                    Sem problema — dá pra <strong>ajustar tudo à mão</strong> nos
                    campos normais (nomes, textos, planos, preços), fica do jeito
                    que você quiser. As gerações por IA voltam amanhã.
                  </p>
                ) : (
                  <>
                    <p className="mt-1.5 text-sm text-ink-mute">
                      <strong className="text-ink-soft">Suba um arquivo</strong> do
                      seu negócio e a IA lê e monta o catálogo inteiro pra você.
                    </p>

                    {/* Arquivo do negócio: soltar/escolher só ANEXA — nada é
                        gerado até o OK. Input escondido, disparado pela dropzone
                        e pelo "troque o arquivo". */}
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setPendingFile(f); // anexa; só gera no OK
                        e.target.value = "";
                      }}
                    />

                    {pendingFile ? (
                      /* ANEXADO (ainda não gerou): confira, remova ou confirme. */
                      <div className="mt-4">
                        <div className="flex items-center gap-3 rounded-2xl border-2 border-accent/40 bg-accent/[0.06] px-3.5 py-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                              className="h-5 w-5"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <path d="M14 2v6h6" />
                            </svg>
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-ink">
                              {pendingFile.name}
                            </div>
                            <div className="text-[11px] text-ink-mute">
                              {fmtSize(pendingFile.size)} · anexado
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPendingFile(null)}
                            title="Remover arquivo"
                            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-mute transition hover:bg-panel-2 hover:text-red-500"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                              className="h-4 w-4"
                            >
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-soft">
                          Arquivo anexado. Clique em{" "}
                          <strong className="text-ink">Gerar catálogo</strong> pra a
                          IA ler o documento e montar suas soluções, planos e
                          argumentos — ou{" "}
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="cursor-pointer font-semibold text-accent underline-offset-2 hover:underline"
                          >
                            troque o arquivo
                          </button>
                          . Nada é gerado até você confirmar.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Caminho principal: soltar/escolher ANEXA o arquivo (não
                            gera). Borda tracejada viva (marching ants). */}
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                          }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOver(false);
                            const f = e.dataTransfer.files?.[0];
                            if (f) setPendingFile(f); // anexa; só gera no OK
                          }}
                          className={`relative mt-4 flex w-full cursor-pointer flex-col items-center gap-2.5 rounded-2xl px-4 py-8 text-center transition ${
                            dragOver
                              ? "bg-accent/[0.14] text-accent shadow-[0_0_0_4px_rgba(169,126,51,0.18)]"
                              : "bg-accent/[0.06] text-accent/60 hover:bg-accent/[0.1] hover:text-accent"
                          }`}
                        >
                          <svg
                            className="pointer-events-none absolute inset-0 h-full w-full"
                            aria-hidden
                          >
                            <rect
                              x="1.5"
                              y="1.5"
                              width="calc(100% - 3px)"
                              height="calc(100% - 3px)"
                              rx="15"
                              ry="15"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeDasharray="10 8"
                              style={{ animation: "catAnts 1.15s linear infinite" }}
                            />
                          </svg>

                          <span className="relative z-[1] grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-6 w-6"
                              aria-hidden
                            >
                              <path d="M12 16V4M7 9l5-5 5 5" />
                              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                            </svg>
                          </span>
                          <span className="relative z-[1] text-sm font-semibold text-ink">
                            Arraste o arquivo do seu negócio aqui
                          </span>
                          <span className="relative z-[1] text-[11px] text-ink-mute">
                            ou clique pra escolher · PDF, DOCX ou TXT
                          </span>
                        </button>

                        {/* "ou descreva": um pouco mais evidente (accent), pra quem
                            não tem arquivo não desistir. Abre no clique. */}
                        {!showDescribe ? (
                          <button
                            type="button"
                            onClick={() => setShowDescribe(true)}
                            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 text-[12.5px] font-semibold text-accent transition hover:opacity-80"
                          >
                            <span className="h-px w-6 bg-accent/30" />
                            ou prefiro descrever em texto
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                              className="h-3.5 w-3.5"
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        ) : (
                          <div className="mt-4">
                            <textarea
                              value={brief}
                              onChange={(e) => setBrief(e.target.value)}
                              rows={5}
                              maxLength={2000}
                              autoFocus
                              placeholder={EXAMPLE}
                              className="w-full resize-none rounded-xl border border-line bg-panel-2 px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-ink-mute/70 focus:border-accent/70"
                            />
                            <div className="mt-1 flex items-center justify-between text-[11px] text-ink-mute">
                              <span>
                                {tooShort ? "Conte um pouco mais…" : "Pronto para gerar."}
                              </span>
                              <span>{brief.length}/2000</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Aviso de substituição — fica por padrão, mas discreto. */}
                    <p className="mt-4 flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-mute">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                        className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600"
                      >
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <path d="M12 9v4M12 17h.01" />
                      </svg>
                      <span>
                        Isto <strong className="text-ink-soft">substitui</strong> seu
                        catálogo atual pelo gerado.
                      </span>
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
                  {/* OK: gera do ARQUIVO anexado ou do TEXTO. Nada roda sem este
                      clique — arquivo/texto só ficam "prontos" até aqui. */}
                  {!noneLeft && (pendingFile || showDescribe) && (
                    <button
                      type="button"
                      onClick={() =>
                        pendingFile ? void sendFile(pendingFile) : generate()
                      }
                      disabled={!pendingFile && tooShort}
                      className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Gerar catálogo
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}

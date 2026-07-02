"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  generateAndReplaceCatalog,
  getAiGenerationsLeft,
} from "@/lib/catalog/actions";
import { trackFunnel } from "@/lib/analytics/google";
import KronosLoader from "./KronosLoader";

const EXAMPLE =
  "Ex: Sou uma agência de marketing para clínicas odontológicas. Faço gestão de tráfego pago (Google e Meta), criação de conteúdo e otimização de perfil. Ticket entre R$ 1.500 e R$ 5.000/mês.";

// Hero da /inicio para conta nova: descreva o negócio → IA gera o catálogo →
// vai direto pra Sua Empresa ver o resultado (WOW). Reusa a mesma geração do
// AiCatalogGenerator (generateAndReplaceCatalog).
export default function AiOnboarding() {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<{ remaining: number; limit: number } | null>(
    null,
  );
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    trackFunnel("onboarding_view");
    getAiGenerationsLeft()
      .then(setLeft)
      .catch(() => {});
  }, []);
  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const tooShort = brief.trim().length < 20;
  const noneLeft = left?.remaining === 0;

  const generate = async () => {
    setLoading(true);
    setError(null);
    setProgress(0);
    trackFunnel("business_described", { chars: brief.trim().length });
    const start = performance.now();
    timer.current = setInterval(() => {
      const s = (performance.now() - start) / 1000;
      setProgress(Math.min(94, (1 - Math.exp(-s / 26)) * 100));
    }, 150);
    try {
      const res = await generateAndReplaceCatalog(brief);
      if (timer.current) clearInterval(timer.current);
      trackFunnel("catalog_generated", { via: "onboarding", solutions: res.solutions });
      setProgress(100);
      await new Promise((r) => setTimeout(r, 350));
      // WOW: emenda direto no GERADOR com a proposta COMPLETA já montada
      // (?bemvindo=1 → seleciona tudo, mostra o preview pronto e enquadra a
      // revisão). Fecha o furo /empresa→/cliente.
      router.push("/cliente?bemvindo=1");
    } catch (e) {
      if (timer.current) clearInterval(timer.current);
      setError(
        e instanceof Error
          ? e.message
          : "Não consegui gerar agora. Tente de novo.",
      );
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5">
        <Image
          src="/kronos-icone-areia.png"
          alt=""
          width={16}
          height={16}
          unoptimized
          className="h-4 w-4"
        />
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
          Comece pela IA
        </span>
      </div>

      <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
        Sua proposta pronta
        <br />
        em <span className="italic text-accent">~1 minuto</span>.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft">
        Descreva seu negócio em um parágrafo e a IA escreve sua{" "}
        <strong className="font-semibold text-ink">proposta inteira</strong> —
        soluções, planos, diagnóstico, estratégia e próximos passos.{" "}
        <strong className="font-semibold text-ink">
          Sem preencher nada à mão.
        </strong>
      </p>

      <div className="mt-7 rounded-2xl border border-line bg-panel p-5 shadow-sm sm:p-6">
        {loading ? (
          <div className="py-6">
            <KronosLoader label="Escrevendo sua proposta…" />
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
              Soluções, planos, diagnóstico, estratégia e próximos passos — no
              tom do seu nicho. Leva alguns instantes.
            </p>
          </div>
        ) : (
          <>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-mute">
              Descreva seu negócio
            </label>
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
                {tooShort
                  ? "O que vende, para quem, serviços e faixa de preço."
                  : "Pronto para gerar."}
              </span>
              <span>{brief.length}/2000</span>
            </div>

            <p className="mt-2.5 rounded-lg border border-accent/25 bg-accent/[0.06] px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
              💡 Quanto mais detalhes você der (serviços, público-alvo, faixa de
              preço, diferenciais),{" "}
              <strong className="text-ink">melhor o resultado</strong>.
            </p>

            {error && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-600">
                {error}
              </p>
            )}

            {noneLeft ? (
              <p className="mt-4 rounded-lg border border-line bg-panel-2 px-3.5 py-3 text-sm text-ink-soft">
                Você já usou suas {left?.limit} gerações por IA. Sem problema —
                monte seu catálogo em{" "}
                <Link href="/empresa" className="text-accent hover:underline">
                  Sua Empresa
                </Link>
                .
              </p>
            ) : (
              <button
                type="button"
                onClick={generate}
                disabled={tooShort}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                ✨ Gerar minha proposta com IA
              </button>
            )}

            <p className="mt-3 text-xs text-ink-mute">
              Depois você revisa e ajusta tudo — é fácil. Prefere fazer manual?{" "}
              <Link href="/empresa" className="text-accent hover:underline">
                configure você mesmo
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

// Barra de ONBOARDING: guia VISUAL até a 1ª proposta, em 3 passos autoexplicativos
// (ícone grande + rótulo curto), com UM único próximo passo em destaque. É de
// propósito MAIOR e mais visível que a TrialBar (conversão), que fica logo abaixo.
// Aparece em TODAS as telas do app — inclusive na home (/inicio) — como reforço
// constante do próximo passo, e some de vez após o 1º download (o objetivo).
// Linguagem sem jargão: "Sua empresa" (não "catálogo") e "Seu cliente" (não "a
// call") — pra qualquer pessoa entender de primeira.
const STEPS = [
  {
    icon: "🏢",
    label: "Sua empresa",
    href: "/empresa?tab=solucoes",
    cta: "Preencher minha empresa",
  },
  {
    icon: "👤",
    label: "Seu cliente",
    href: "/cliente",
    cta: "Preencher o cliente",
  },
  {
    icon: "⬇️",
    label: "Baixe a proposta",
    href: "/cliente",
    cta: "Baixar a proposta",
  },
];

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-5 w-5"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function OnboardingBar({
  hasCatalog,
  hasProposal,
  hasDownloaded,
}: {
  hasCatalog: boolean;
  hasProposal: boolean;
  hasDownloaded: boolean;
}) {
  // Some de vez após o 1º download (o objetivo). Aparece em todas as telas,
  // inclusive na home.
  if (hasDownloaded) return null;

  const done = [hasCatalog, hasProposal, hasDownloaded];
  const current = !hasCatalog ? 1 : !hasProposal ? 2 : 3; // 1º passo incompleto
  const cur = STEPS[current - 1];

  return (
    <div className="shrink-0 border-b-2 border-accent/40 bg-panel bg-gradient-to-b from-accent/[0.09] to-transparent px-4 py-4">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3.5 md:flex-row md:justify-between md:gap-8">
        {/* Título curto + trilha dos 3 passos */}
        <div className="flex flex-col items-center gap-2.5 md:flex-row md:gap-5">
          <p className="whitespace-nowrap text-[15px] font-extrabold text-ink md:text-base">
            Sua 1ª proposta{" "}
            <span className="font-semibold text-ink-mute">em 3 passos</span>
          </p>
          <ol className="flex items-center gap-1.5 sm:gap-2.5">
            {STEPS.map((s, idx) => {
              const isDone = done[idx];
              const isCur = idx + 1 === current;
              return (
                <li key={idx} className="flex items-center gap-1.5 sm:gap-2.5">
                  <div
                    className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition sm:pr-3 ${
                      isCur ? "bg-accent/15 ring-1 ring-accent/45" : ""
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg leading-none ${
                        isDone
                          ? "bg-emerald-600 text-white"
                          : isCur
                            ? "bg-accent text-bg shadow-[0_5px_16px_-3px_var(--color-accent)]"
                            : "border border-line bg-panel text-ink-mute opacity-60"
                      }`}
                    >
                      {isDone ? <Check /> : <span aria-hidden>{s.icon}</span>}
                    </span>
                    <span
                      className={`hidden whitespace-nowrap text-sm font-bold sm:inline ${
                        isDone
                          ? "text-emerald-500"
                          : isCur
                            ? "text-ink"
                            : "text-ink-mute"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <span
                      className={`h-1 w-4 rounded-full sm:w-8 ${
                        done[idx] ? "bg-emerald-600" : "bg-line"
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Próximo passo — UM único CTA, grande e com brilho (chamariz de clique) */}
        <Link
          href={cur.href}
          className="kronos-btn-glow inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-6 py-3 text-[15px] font-extrabold text-bg shadow-sm transition hover:opacity-90 md:text-base"
        >
          {cur.cta}
          <span aria-hidden className="text-lg leading-none">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}

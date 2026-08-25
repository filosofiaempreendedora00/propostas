"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Barra de ONBOARDING: mostra o progresso dos 3 passos (com check nos cumpridos)
// enquanto o lead navega pela ferramenta. NÃO aparece na home (/inicio já tem os
// 3 cards) e SOME de vez após o 1º download (o grande objetivo). Fica junto da
// faixa de conversão (TrialBar) — são duas barras com papéis diferentes.
const STEPS = [
  { n: 1, label: "Monte o catálogo", href: "/empresa?tab=solucoes", cta: "Montar catálogo" },
  { n: 2, label: "Traga a call", href: "/cliente", cta: "Trazer a call" },
  { n: 3, label: "Baixe a proposta", href: "/cliente", cta: "Montar e baixar" },
];

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-3 w-3"
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
  const pathname = usePathname();

  // Some após o 1º download; nunca aparece na home.
  if (hasDownloaded) return null;
  if (pathname.startsWith("/inicio")) return null;

  const done = [hasCatalog, hasProposal, hasDownloaded];
  const current = !hasCatalog ? 1 : !hasProposal ? 2 : 3; // 1º passo incompleto
  const cur = STEPS[current - 1];

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-b border-line bg-panel px-4 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
        Seu progresso
      </span>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {STEPS.map((s, idx) => {
          const isDone = done[idx];
          const isCur = s.n === current;
          return (
            <div key={s.n} className="flex items-center gap-1.5">
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                  isDone
                    ? "bg-emerald-600 text-white"
                    : isCur
                      ? "bg-accent text-bg"
                      : "border border-line text-ink-mute"
                }`}
              >
                {isDone ? <Check /> : s.n}
              </span>
              <span
                className={`text-[12.5px] ${
                  isCur
                    ? "font-semibold text-ink"
                    : isDone
                      ? "font-medium text-ink-soft line-through decoration-emerald-600/50"
                      : "text-ink-mute"
                }`}
              >
                {s.label}
              </span>
              {idx < STEPS.length - 1 && (
                <span className="mx-1 hidden h-px w-6 bg-line sm:block" />
              )}
            </div>
          );
        })}
      </div>
      <Link
        href={cur.href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-1 text-[12px] font-bold text-bg transition hover:opacity-90"
      >
        {cur.cta}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

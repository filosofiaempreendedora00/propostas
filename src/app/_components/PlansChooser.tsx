"use client";

import { useState } from "react";

// ⚠️ CONFIRME ESTES VALORES com as suas ofertas na Kiwify (precisam bater com o checkout).
// annualPerMonth = preço "por mês" equivalente no plano anual; annualTotal = cobrança anual.
const PRICES = {
  individual: { monthly: 67, annualPerMonth: 49, annualTotal: 588 },
  time: { monthly: 197, annualPerMonth: 147, annualTotal: 1764 },
};
const DISCOUNT = 25; // % de desconto no anual (Individual ~27%, Time ~25%)

const brl = (n: number) => n.toLocaleString("pt-BR");

type Links = { monthly: string; annual: string };
type Props = {
  email: string | null;
  individual: Links;
  time: Links;
};

function withEmail(url: string, email: string | null) {
  if (!url) return "#";
  if (!email) return url;
  return `${url}${url.includes("?") ? "&" : "?"}email=${encodeURIComponent(email)}`;
}

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function PlanCard({
  name,
  tagline,
  monthly,
  annualPerMonth,
  annualTotal,
  features,
  link,
  annual,
  focus,
  email,
}: {
  name: string;
  tagline: string;
  monthly: number;
  annualPerMonth: number;
  annualTotal: number;
  features: string[];
  link: string;
  annual: boolean;
  focus?: boolean;
  email: string | null;
}) {
  const price = annual ? annualPerMonth : monthly;
  const save = monthly * 12 - annualTotal;
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition ${
        focus
          ? "border-accent/55 bg-accent/[0.06] shadow-[0_18px_50px_-20px_rgba(168,144,112,0.45)]"
          : "border-line bg-panel"
      }`}
    >
      {focus && (
        <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bg">
          Mais popular
        </span>
      )}
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
        {name}
      </h2>
      <p className="mt-1 text-sm text-ink-mute">{tagline}</p>

      <div className="mt-4 min-h-[68px]">
        <div className="flex items-end gap-1">
          <span className="text-sm text-ink-mute">R$</span>
          <span className="font-display text-4xl font-semibold leading-none text-ink">
            {brl(price)}
          </span>
          <span className="mb-1 text-sm text-ink-mute">/mês</span>
        </div>
        {annual ? (
          <p className="mt-1.5 text-xs text-ink-mute">
            <span className="text-emerald-400">Economize R$ {brl(save)}/ano</span>{" "}
            · cobrado R$ {brl(annualTotal)}/ano
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-ink-mute">
            cobrado mensalmente · cancele quando quiser
          </p>
        )}
      </div>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-sm text-ink-soft">
            <Check />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <a
        href={withEmail(link, email)}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!link}
        className={`mt-6 rounded-full bg-accent px-5 py-3 text-center text-sm font-semibold text-bg transition hover:opacity-90 ${
          !link ? "pointer-events-none opacity-40" : ""
        }`}
      >
        Assinar {name}
        {annual ? " anual" : ""}
      </a>
    </div>
  );
}

export default function PlansChooser({ email, individual, time }: Props) {
  const [annual, setAnnual] = useState(true); // foco no anual por padrão

  return (
    <div>
      {/* Switcher Mensal / Anual */}
      <div className="mb-7 flex justify-center">
        <div className="inline-flex items-center rounded-full border border-line bg-panel p-1">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              !annual ? "bg-accent text-bg" : "text-ink-mute hover:text-ink-soft"
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              annual ? "bg-accent text-bg" : "text-ink-mute hover:text-ink-soft"
            }`}
          >
            Anual
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                annual
                  ? "bg-bg/20 text-bg"
                  : "bg-emerald-500/15 text-emerald-400"
              }`}
            >
              −{DISCOUNT}%
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PlanCard
          name="Individual"
          tagline="Para o vendedor que quer render como um time."
          monthly={PRICES.individual.monthly}
          annualPerMonth={PRICES.individual.annualPerMonth}
          annualTotal={PRICES.individual.annualTotal}
          link={annual ? individual.annual : individual.monthly}
          annual={annual}
          focus
          email={email}
          features={[
            "1 usuário",
            "Soluções e planos ilimitados",
            "Propostas ilimitadas",
            "Geração em 60 segundos",
            "Suporte por e-mail e chat",
          ]}
        />
        <PlanCard
          name="Time"
          tagline="Para multiplicar o comercial inteiro."
          monthly={PRICES.time.monthly}
          annualPerMonth={PRICES.time.annualPerMonth}
          annualTotal={PRICES.time.annualTotal}
          link={annual ? time.annual : time.monthly}
          annual={annual}
          email={email}
          features={[
            "Tudo do Individual",
            "Até 10 usuários",
            "Catálogo compartilhado pelo time",
            "Padrão único de marca",
            "Suporte prioritário por WhatsApp",
          ]}
        />
      </div>
    </div>
  );
}

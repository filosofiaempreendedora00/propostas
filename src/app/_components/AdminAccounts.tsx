"use client";

import { useState } from "react";
import { getAccountDetail } from "@/lib/admin/actions";
import type { AdminOrg, AccountDetail, Temperature } from "@/lib/admin/data";

const TEMP: Record<Temperature, { label: string; icon: string; cls: string }> = {
  cliente: {
    label: "Cliente",
    icon: "✅",
    cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  },
  quente: {
    label: "Quente",
    icon: "🔥",
    cls: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  },
  morno: {
    label: "Morno",
    icon: "🌡️",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  frio: {
    label: "Frio",
    icon: "❄️",
    cls: "border-sky-500/25 bg-sky-500/10 text-sky-300/90",
  },
};

const TZ = "America/Sao_Paulo"; // horário de Brasília

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: TZ,
    });
  } catch {
    return "—";
  }
}

// Data + hora em Brasília (mostrada na linha do lead, sem expandir).
function fmtDateTimeBR(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TZ,
    });
  } catch {
    return "—";
  }
}

// Chave AAAA-MM-DD em Brasília — pra comparar com os inputs de data do filtro.
function brDateKey(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
  } catch {
    return "";
  }
}

// Uma solução/consultor está no "padrão de exemplo"?
const DEFAULT_SOL_TAGS = [
  "",
  "Resumo de uma linha do que esta solução entrega.",
  "Outra frente de trabalho, totalmente preenchível.",
];
const isDefaultSolution = (s: { name: string; tagline: string }) =>
  /^Solução [0-9]+$/.test(s.name) && DEFAULT_SOL_TAGS.includes(s.tagline.trim());
const isRealPhone = (p: string) => (p.replace(/\D/g, "").replace(/0/g, "").length) > 0;
const waLink = (p: string) => `https://wa.me/55${p.replace(/\D/g, "")}`;

function Signal({ on, children }: { on: boolean; children: React.ReactNode }) {
  if (!on) return null;
  return (
    <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
      {children}
    </span>
  );
}

export default function AdminAccounts({ accounts }: { accounts: AdminOrg[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [details, setDetails] = useState<
    Record<string, AccountDetail | "loading" | "error">
  >({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = accounts.filter((o) => {
    const k = brDateKey(o.createdAt);
    if (from && (!k || k < from)) return false;
    if (to && (!k || k > to)) return false;
    return true;
  });

  const setPreset = (days: number | null) => {
    if (days === null) {
      setFrom("");
      setTo("");
      return;
    }
    setTo(brDateKey(new Date().toISOString()));
    setFrom(brDateKey(new Date(Date.now() - days * 86400000).toISOString()));
  };

  const toggle = async (id: string) => {
    if (open === id) {
      setOpen(null);
      return;
    }
    setOpen(id);
    if (!details[id]) {
      setDetails((d) => ({ ...d, [id]: "loading" }));
      try {
        const det = await getAccountDetail(id);
        setDetails((d) => ({ ...d, [id]: det }));
      } catch {
        setDetails((d) => ({ ...d, [id]: "error" }));
      }
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-line p-8 text-center text-sm text-ink-mute">
        Nenhuma conta ainda.
      </div>
    );
  }

  return (
    <>
      {/* Filtro por data de cadastro (horário de Brasília) */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel/40 px-3 py-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-mute">
          Cadastro
        </span>
        <div className="inline-flex rounded-lg border border-line p-0.5 text-xs">
          {[
            { l: "Tudo", d: null },
            { l: "7 dias", d: 6 },
            { l: "30 dias", d: 29 },
          ].map((b) => (
            <button
              key={b.l}
              type="button"
              onClick={() => setPreset(b.d)}
              className="rounded-md px-2.5 py-1 font-medium text-ink-mute transition hover:text-ink"
            >
              {b.l}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-xs text-ink-mute">
          De
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-line bg-panel-2 px-2 py-1 text-ink [color-scheme:dark]"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-ink-mute">
          Até
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-line bg-panel-2 px-2 py-1 text-ink [color-scheme:dark]"
          />
        </label>
        {(from || to) && (
          <button
            type="button"
            onClick={() => setPreset(null)}
            className="text-xs text-accent hover:underline"
          >
            limpar
          </button>
        )}
        <span className="ml-auto text-xs text-ink-mute">
          {filtered.length} de {accounts.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-mute">
            Nenhum lead nesse período.
          </div>
        )}
        {filtered.map((o) => {
        const t = TEMP[o.temperature];
        const d = details[o.id];
        const expanded = open === o.id;
        return (
          <div key={o.id} className="border-t border-line first:border-t-0">
            <button
              type="button"
              onClick={() => toggle(o.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-panel/50 ${
                expanded ? "bg-panel/50" : ""
              }`}
            >
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${t.cls}`}
              >
                {t.icon} {t.label}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">
                  {o.name}
                </div>
                <div className="truncate text-xs text-ink-mute">
                  {o.ownerEmail ?? "—"}
                </div>
              </div>
              <div className="hidden shrink-0 whitespace-nowrap text-right text-[11px] text-ink-mute sm:block">
                {fmtDateTimeBR(o.createdAt)}
              </div>
              <div className="hidden flex-wrap items-center justify-end gap-1 sm:flex">
                <Signal on={o.hasLogo}>logo</Signal>
                <Signal on={o.customSolution}>solução</Signal>
                <Signal on={o.customConsultant}>consultor</Signal>
                <Signal on={o.customPlan}>plano</Signal>
                {o.downloadsUsed > 0 && (
                  <span className="rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                    {o.downloadsUsed} baixou
                  </span>
                )}
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 shrink-0 text-ink-mute transition-transform ${expanded ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {expanded && (
              <div className="border-t border-line bg-panel/30 px-4 py-4 text-sm">
                {d === "loading" || d === undefined ? (
                  <p className="text-ink-mute">Carregando raio-x…</p>
                ) : d === "error" ? (
                  <p className="text-red-300">Não consegui carregar o detalhe.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Coluna 1 — identidade + números */}
                    <div className="space-y-2">
                      <Row k="Nome no cadastro" v={d.signupName ?? "—"} />
                      <Row k="Plano / status" v={`${o.plan} · ${o.status}`} />
                      <Row
                        k="Downloads"
                        v={`${o.downloadsUsed} · 1º em ${fmtDate(o.firstDownloadAt)}`}
                      />
                      <Row
                        k="Logo"
                        v={
                          d.hasLogo || d.hasLogoDark
                            ? `sim${d.hasLogo ? " (clara)" : ""}${d.hasLogoDark ? " (escura)" : ""}`
                            : "não enviou"
                        }
                      />
                      <Row
                        k="Catálogo"
                        v={`${d.plansCount} planos · ${d.templatesCount} templates`}
                      />
                      <Row k="Criada em" v={fmtDate(o.createdAt)} />
                    </div>

                    {/* Coluna 2 — conteúdo real */}
                    <div className="space-y-3">
                      <div>
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
                          Soluções
                        </div>
                        {d.solutions.length === 0 ? (
                          <p className="text-xs text-ink-mute">nenhuma</p>
                        ) : (
                          <ul className="space-y-1">
                            {d.solutions.map((s, i) => {
                              const def = isDefaultSolution(s);
                              return (
                                <li key={i} className="text-[13px]">
                                  <span
                                    className={
                                      def ? "text-ink-mute" : "font-medium text-ink"
                                    }
                                  >
                                    {s.name || "(sem nome)"}
                                  </span>
                                  {def ? (
                                    <span className="ml-1 text-[10px] text-ink-mute">
                                      (padrão)
                                    </span>
                                  ) : (
                                    s.tagline && (
                                      <span className="text-ink-soft">
                                        {" "}
                                        — {s.tagline}
                                      </span>
                                    )
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      <div>
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
                          Consultores
                        </div>
                        {d.consultants.length === 0 ? (
                          <p className="text-xs text-ink-mute">nenhum</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {d.consultants.map((c, i) => {
                              const real =
                                c.name !== "Nome do Consultor" ||
                                c.email !== "consultor@suaempresa.com";
                              return (
                                <li
                                  key={i}
                                  className={`text-[13px] ${real ? "text-ink-soft" : "text-ink-mute"}`}
                                >
                                  <span
                                    className={real ? "font-medium text-ink" : ""}
                                  >
                                    {c.name || "(sem nome)"}
                                  </span>
                                  {c.role && (
                                    <span className="text-ink-mute"> · {c.role}</span>
                                  )}
                                  {real && c.email && (
                                    <span> · {c.email}</span>
                                  )}
                                  {real && isRealPhone(c.phone) && (
                                    <>
                                      {" · "}
                                      <a
                                        href={waLink(c.phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-emerald-400 hover:underline"
                                      >
                                        {c.phone} ↗
                                      </a>
                                    </>
                                  )}
                                  {!real && (
                                    <span className="ml-1 text-[10px]">(padrão)</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-xs text-ink-mute">{k}</span>
      <span className="text-[13px] text-ink-soft">{v}</span>
    </div>
  );
}

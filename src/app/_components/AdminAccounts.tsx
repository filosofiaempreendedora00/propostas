"use client";

import { useEffect, useState } from "react";
import { getAccountDetail } from "@/lib/admin/actions";
import type { AdminOrg, AccountDetail, Temperature } from "@/lib/admin/data";
import { FREE_DOWNLOADS } from "@/lib/limits";

// Filtro por atividade de download. Nenhum = todos.
//   baixou   = baixou ao menos 1 proposta (downloadsUsed≥1 ou já teve 1º download)
//   esgotou  = usou os 3 downloads grátis e não assinou (preso no paywall)
type DownloadFilter = "all" | "baixou" | "esgotou";
const downloadedAtLeastOnce = (o: AdminOrg) =>
  o.downloadsUsed >= 1 || !!o.firstDownloadAt;
const exhaustedFree = (o: AdminOrg) =>
  o.status !== "active" && o.downloadsUsed >= FREE_DOWNLOADS;

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

// Origem do lead (acquisition_source: google | meta) — tag visual no painel.
// 'direct' não ganha tag (nada a mostrar).
const SRC: Record<string, { label: string; cls: string }> = {
  meta: {
    label: "Meta",
    cls: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  },
  google: {
    label: "Google",
    cls: "border-violet-500/40 bg-violet-500/10 text-violet-300",
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
const fmtWa = (p: string) => {
  const d = p.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p;
};

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
  const [temps, setTemps] = useState<Set<Temperature>>(new Set());
  const [srcs, setSrcs] = useState<Set<string>>(new Set());
  const [dl, setDl] = useState<DownloadFilter>("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const toggleTemp = (k: Temperature) =>
    setTemps((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const toggleSrc = (k: string) =>
    setSrcs((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const filtered = accounts.filter((o) => {
    const k = brDateKey(o.createdAt);
    if (from && (!k || k < from)) return false;
    if (to && (!k || k > to)) return false;
    if (temps.size > 0 && !temps.has(o.temperature)) return false;
    if (srcs.size > 0 && !(o.acquisitionSource && srcs.has(o.acquisitionSource)))
      return false;
    if (dl === "baixou" && !downloadedAtLeastOnce(o)) return false;
    if (dl === "esgotou" && !exhaustedFree(o)) return false;
    return true;
  });

  // Paginação: 25 por página. Volta pra 1ª página quando o filtro muda.
  useEffect(() => setPage(0), [from, to, temps, srcs, dl]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

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
        <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-mute">
          Origem
        </span>
        <div className="inline-flex flex-wrap gap-1">
          {(["google", "meta"] as const).map((k) => {
            const s = SRC[k];
            const active = srcs.has(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleSrc(k)}
                className={`cursor-pointer rounded-full border px-2 py-1 text-[11px] font-semibold transition ${
                  active ? s.cls : "border-line text-ink-mute hover:text-ink"
                }`}
              >
                {s.label}
              </button>
            );
          })}
          {srcs.size > 0 && (
            <button
              type="button"
              onClick={() => setSrcs(new Set())}
              className="cursor-pointer px-1 text-xs text-accent hover:underline"
            >
              limpar
            </button>
          )}
        </div>
        <span className="ml-auto text-xs text-ink-mute">
          {filtered.length} de {accounts.length}
        </span>
      </div>

      {/* Filtro de temperatura — controle segmentado com contagem por faixa
          (não "tagzinha"): mostra a distribuição real e filtra ao clicar. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["quente", "morno", "frio", "cliente"] as Temperature[]).map((k) => {
          const tt = TEMP[k];
          const active = temps.has(k);
          const n = accounts.filter((o) => o.temperature === k).length;
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggleTemp(k)}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                active
                  ? `${tt.cls} ring-1 ring-inset ring-current`
                  : "border-line text-ink-soft hover:border-ink-mute/50 hover:text-ink"
              }`}
            >
              <span className="text-base leading-none">{tt.icon}</span>
              {tt.label}
              <span
                className={`ml-0.5 min-w-[1.5rem] rounded-md px-1.5 py-0.5 text-center text-xs font-bold tabular-nums ${
                  active ? "bg-black/25" : "bg-panel-2 text-ink-mute"
                }`}
              >
                {n}
              </span>
            </button>
          );
        })}
        {temps.size > 0 && (
          <button
            type="button"
            onClick={() => setTemps(new Set())}
            className="cursor-pointer px-2 text-xs text-accent hover:underline"
          >
            limpar filtro
          </button>
        )}

        {/* Separador + filtro por atividade de DOWNLOAD (single-select). */}
        <span className="mx-1 hidden h-8 w-px bg-line sm:block" />
        {(
          [
            {
              k: "baixou",
              label: "Baixou ≥1",
              icon: "📥",
              n: accounts.filter(downloadedAtLeastOnce).length,
            },
            {
              k: "esgotou",
              label: "Cota 3/3",
              icon: "🔒",
              n: accounts.filter(exhaustedFree).length,
            },
          ] as { k: DownloadFilter; label: string; icon: string; n: number }[]
        ).map((f) => {
          const active = dl === f.k;
          return (
            <button
              key={f.k}
              type="button"
              onClick={() => setDl(active ? "all" : f.k)}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "border-accent/50 bg-accent/10 text-accent ring-1 ring-inset ring-current"
                  : "border-line text-ink-soft hover:border-ink-mute/50 hover:text-ink"
              }`}
              title={
                f.k === "esgotou"
                  ? "Usaram os 3 downloads grátis e não assinaram (presos no paywall)"
                  : "Baixaram ao menos uma proposta"
              }
            >
              <span className="text-base leading-none">{f.icon}</span>
              {f.label}
              <span
                className={`ml-0.5 min-w-[1.5rem] rounded-md px-1.5 py-0.5 text-center text-xs font-bold tabular-nums ${
                  active ? "bg-black/25" : "bg-panel-2 text-ink-mute"
                }`}
              >
                {f.n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-mute">
            Nenhum lead nesse período.
          </div>
        )}
        {paged.map((o) => {
        const t = TEMP[o.temperature];
        const d = details[o.id];
        const expanded = open === o.id;
        return (
          <div key={o.id} className="border-t border-line first:border-t-0">
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggle(o.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(o.id);
                }
              }}
              className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition hover:bg-panel/50 ${
                expanded ? "bg-panel/50" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                {/* Tags de temperatura + canal em cima; nome/email à esquerda embaixo. */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${t.cls}`}
                  >
                    {t.icon} {t.label}
                  </span>
                  {o.acquisitionSource && SRC[o.acquisitionSource] && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SRC[o.acquisitionSource].cls}`}
                      title={
                        o.acquisitionGclid
                          ? `Origem do lead · gclid: ${o.acquisitionGclid}`
                          : o.acquisitionFbclid
                            ? `Origem do lead · fbclid: ${o.acquisitionFbclid}`
                            : o.acquisitionFirstUrl
                              ? `Origem do lead · ${o.acquisitionFirstUrl}`
                              : "Origem do lead"
                      }
                    >
                      {SRC[o.acquisitionSource].label}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 truncate text-sm font-medium text-ink">
                  {o.name}
                </div>
                <div
                  className="cursor-text select-text truncate text-xs text-ink-mute"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Selecione e copie"
                >
                  {o.ownerEmail ?? "—"}
                </div>
                {/* UM WhatsApp só: prioriza o do CADASTRO (opt-in); se não houver,
                    cai pro do consultor. Evita mostrar o mesmo número 2x. */}
                {(() => {
                  const wa = o.ownerWhatsapp || o.consultantWhatsapp;
                  if (!wa) return null;
                  const optin = !!o.ownerWhatsapp || o.consultantOptin;
                  return (
                    <div
                      className="mt-0.5 flex items-center gap-1.5 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={waLink(wa)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                        title="Abrir WhatsApp do lead"
                      >
                        💬 {fmtWa(wa)} ↗
                      </a>
                      <span
                        className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] font-semibold ${
                          optin
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-line text-ink-mute"
                        }`}
                        title={
                          optin
                            ? "WhatsApp com opt-in (autorizou contato)"
                            : "Sem opt-in de WhatsApp"
                        }
                      >
                        {optin ? "✓ opt-in" : "sem opt-in"}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                <div className="whitespace-nowrap text-[11px] text-ink-mute">
                  {fmtDateTimeBR(o.createdAt)}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <Signal on={o.hasLogo}>logo</Signal>
                  <Signal on={o.customSolution}>solução</Signal>
                  <Signal on={o.consultantHasContact}>contato</Signal>
                  <Signal on={o.customPlan}>plano</Signal>
                  {o.downloadsUsed > 0 && (
                    <span className="rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                      {o.downloadsUsed} baixou
                    </span>
                  )}
                </div>
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
            </div>

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
                                      <span
                                        className={`ml-1 rounded-full border px-1.5 py-px text-[9px] font-semibold ${
                                          c.whatsappOptin
                                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                            : "border-line text-ink-mute"
                                        }`}
                                      >
                                        {c.whatsappOptin ? "✓ opt-in" : "sem opt-in"}
                                      </span>
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

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-ink-mute">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="cursor-pointer rounded-lg border border-line px-3 py-1.5 font-medium text-ink-soft transition enabled:hover:border-accent/50 enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="tabular-nums">
            {safePage * PAGE_SIZE + 1}–
            {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de{" "}
            {filtered.length} · pág. {safePage + 1}/{pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="cursor-pointer rounded-lg border border-line px-3 py-1.5 font-medium text-ink-soft transition enabled:hover:border-accent/50 enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
      )}
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

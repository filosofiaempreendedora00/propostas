"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DEFAULT_PROPOSAL } from "@/lib/proposal/defaults";
import { renderProposalHTML, slugify } from "@/lib/proposal/render";
import type { ProposalData, Tier } from "@/lib/proposal/types";
import { useCatalog, usePlans, useConsultants } from "@/lib/catalog/store";
import type { CatalogSolution, CatalogPlan } from "@/lib/catalog/types";
import { Label, SectionTitle, MiniBtn } from "./fields";

type ClientForm = Omit<
  ProposalData,
  "solutions" | "tiers" | "responsible" | "phone" | "email"
>;

const ACCENT_PRESETS = [
  { name: "Champagne", value: "#C9A876" },
  { name: "Azul", value: "#6E8BFF" },
  { name: "Esmeralda", value: "#3FB984" },
  { name: "Coral", value: "#E8765C" },
  { name: "Violeta", value: "#9B6DFF" },
  { name: "Prata", value: "#B8BCC4" },
];

const DND_TYPE = "application/x-consultant-id";

function toRenderSolution(s: CatalogSolution) {
  const features =
    s.deliverables.length > 0
      ? s.deliverables
      : s.highlights.length > 0
        ? s.highlights
        : s.scope;
  return { title: s.name, description: s.description || s.tagline, features };
}

function planToTier(p: CatalogPlan, solutions: CatalogSolution[]): Tier {
  const solNames = p.solutionIds
    .map((id) => solutions.find((s) => s.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  return {
    name: p.name,
    price: p.price,
    priceSuffix: p.priceSuffix,
    description: p.description,
    features: [...solNames, ...p.extraFeatures],
    featured: p.featured,
  };
}

export default function ClientBuilder() {
  const { items: solutions, ready: solReady } = useCatalog();
  const { items: plans, ready: planReady } = usePlans();
  const { items: consultants, ready: consReady } = useConsultants();

  const [form, setForm] = useState<ClientForm>(() => {
    const {
      solutions: _s,
      tiers: _t,
      responsible: _r,
      phone: _p,
      email: _e,
      ...rest
    } = DEFAULT_PROPOSAL;
    void _s;
    void _t;
    void _r;
    void _p;
    void _e;
    return rest;
  });

  const [selSolutions, setSelSolutions] = useState<Set<string>>(new Set());
  const [selPlans, setSelPlans] = useState<Set<string>>(new Set());
  const [consultantId, setConsultantId] = useState<string | null>(null);
  const seededSol = useRef(false);
  const seededPlan = useRef(false);
  const seededCons = useRef(false);
  const [dragOver, setDragOver] = useState(false);
  const skipRender = useRef(false);

  useEffect(() => {
    if (solReady && !seededSol.current) {
      seededSol.current = true;
      setSelSolutions(new Set(solutions.map((s) => s.id)));
    }
  }, [solReady, solutions]);
  useEffect(() => {
    if (planReady && !seededPlan.current) {
      seededPlan.current = true;
      setSelPlans(new Set(plans.map((p) => p.id)));
    }
  }, [planReady, plans]);
  useEffect(() => {
    if (consReady && !seededCons.current) {
      seededCons.current = true;
      setConsultantId(consultants[0]?.id ?? null);
    }
  }, [consReady, consultants]);

  const set = <K extends keyof ClientForm>(key: K, value: ClientForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (setter: typeof setSelSolutions, id: string) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const consultant = consultants.find((c) => c.id === consultantId) ?? null;

  const data: ProposalData = useMemo(() => {
    const chosenSolutions = solutions
      .filter((s) => selSolutions.has(s.id))
      .map(toRenderSolution);
    const chosenTiers = plans
      .filter((p) => selPlans.has(p.id))
      .map((p) => planToTier(p, solutions));
    return {
      ...form,
      solutions: chosenSolutions,
      tiers: chosenTiers,
      responsible: consultant?.name ?? "",
      phone: consultant?.phone ?? "",
      email: consultant?.email ?? "",
    };
  }, [form, solutions, plans, selSolutions, selPlans, consultant]);

  // ----- edição inline vinda do preview -----
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const m = e.data;
      if (!m || m.source !== "proposal-edit" || typeof m.field !== "string")
        return;
      const field: string = m.field;
      const value = String(m.value ?? "");
      skipRender.current = true; // o iframe já mostra a edição; não recarregar
      if (field.startsWith("pain.")) {
        const [, idxStr, key] = field.split(".");
        const idx = Number(idxStr);
        setForm((f) => ({
          ...f,
          pains: f.pains.map((p, i) =>
            i === idx ? { ...p, [key]: value } : p,
          ),
        }));
      } else {
        setForm((f) => ({ ...f, [field]: value }) as ClientForm);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // ----- pains (estrutura) -----
  const addPain = () =>
    setForm((f) => ({
      ...f,
      pains: [...f.pains, { title: "Nova dor", description: "Descrição." }],
    }));
  const removePain = (i: number) =>
    setForm((f) => ({ ...f, pains: f.pains.filter((_, idx) => idx !== i) }));

  // ----- preview (debounced; pulado em edição inline) -----
  const [previewHtml, setPreviewHtml] = useState<string>(() =>
    renderProposalHTML(DEFAULT_PROPOSAL),
  );
  useEffect(() => {
    if (skipRender.current) {
      skipRender.current = false;
      return;
    }
    const id = setTimeout(() => setPreviewHtml(renderProposalHTML(data)), 300);
    return () => clearTimeout(id);
  }, [data]);

  // ----- export -----
  const exportRef = useRef<HTMLAnchorElement | null>(null);
  const handleExport = () => {
    const html = renderProposalHTML(data);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = exportRef.current ?? document.createElement("a");
    a.href = url;
    a.download = `proposta-${slugify(data.clientName)}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ----- consultor: drag & drop -----
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const id =
      e.dataTransfer.getData(DND_TYPE) || e.dataTransfer.getData("text/plain");
    if (id && consultants.some((c) => c.id === id)) setConsultantId(id);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Sub-header */}
      <div className="flex items-center justify-between border-b border-line px-6 py-2.5">
        <div className="text-[11px] text-ink-mute">
          {data.solutions.length} solução(ões) · {data.tiers.length} plano(s)
        </div>
        <button
          onClick={handleExport}
          className="rounded-full px-5 py-2 text-sm font-semibold text-bg transition hover:opacity-90"
          style={{ background: form.accent }}
        >
          ⬇ Baixar HTML
        </button>
        <a ref={exportRef} className="hidden" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,380px)_1fr]">
        {/* Painel: só controles. Os textos editam-se no preview. */}
        <div className="form-scroll overflow-y-auto border-r border-line px-6 py-6">
          <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-xs leading-relaxed text-ink-soft">
            ✏️ <strong className="text-ink">Edite os textos no preview.</strong>{" "}
            Passe o mouse sobre títulos, subtítulos, o desafio, dores e
            fechamento — aparece um contorno tracejado. Clique e edite ali
            mesmo. Soluções, planos e consultor vêm de{" "}
            <Link href="/empresa" className="text-accent hover:underline">
              Sua Empresa
            </Link>
            .
          </div>

          <SectionTitle>Soluções da proposta</SectionTitle>
          {solReady && solutions.length === 0 ? (
            <EmptyCatalog label="solução" />
          ) : (
            <div className="space-y-2">
              <p className="mb-1 text-xs text-ink-mute">
                Selecione quais soluções entram nesta proposta.
              </p>
              {solutions.map((s) => (
                <SelectCard
                  key={s.id}
                  on={selSolutions.has(s.id)}
                  onClick={() => toggle(setSelSolutions, s.id)}
                  title={`${s.icon} ${s.name}`}
                  subtitle={s.tagline}
                />
              ))}
            </div>
          )}

          <SectionTitle>Planos (Investimento)</SectionTitle>
          {planReady && plans.length === 0 ? (
            <EmptyCatalog label="plano" />
          ) : (
            <div className="space-y-2">
              <p className="mb-1 text-xs text-ink-mute">
                Selecione os planos que aparecem na proposta.
              </p>
              {plans.map((p) => (
                <SelectCard
                  key={p.id}
                  on={selPlans.has(p.id)}
                  onClick={() => toggle(setSelPlans, p.id)}
                  title={`${p.name}${p.featured ? " ★" : ""}`}
                  subtitle={`${p.price}${p.priceSuffix} · ${p.solutionIds.length} solução(ões)`}
                />
              ))}
            </div>
          )}

          <SectionTitle>Consultor responsável</SectionTitle>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-lg border border-dashed p-3 transition ${
              dragOver ? "border-accent bg-accent/10" : "border-line bg-panel"
            }`}
          >
            {consultant ? (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {consultant.name}
                  </div>
                  <div className="truncate text-xs text-ink-mute">
                    {consultant.email || "sem e-mail"}
                    {consultant.phone ? ` · ${consultant.phone}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConsultantId(null)}
                  className="shrink-0 text-xs text-ink-mute hover:text-red-400"
                >
                  limpar
                </button>
              </div>
            ) : (
              <div className="text-center text-xs text-ink-mute">
                Arraste um consultor para cá (ou clique abaixo)
              </div>
            )}
          </div>
          {consReady && consultants.length === 0 ? (
            <div className="mt-2">
              <EmptyCatalog label="consultor" />
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {consultants.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DND_TYPE, c.id);
                    e.dataTransfer.setData("text/plain", c.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => setConsultantId(c.id)}
                  title="Arraste ou clique para puxar"
                  className={`cursor-grab rounded-full border px-3 py-1.5 text-xs font-medium transition active:cursor-grabbing ${
                    consultantId === c.id
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-line text-ink-soft hover:border-ink-mute"
                  }`}
                >
                  ⠿ {c.name || "Sem nome"}
                </button>
              ))}
            </div>
          )}

          <SectionTitle>Dores (O Desafio)</SectionTitle>
          <p className="mb-2 text-xs text-ink-mute">
            Adicione ou remova cards. O texto edita-se no preview.
          </p>
          <div className="space-y-2">
            {form.pains.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">
                  <span className="text-ink-mute">
                    {String(i + 1).padStart(2, "0")} ·{" "}
                  </span>
                  {p.title || "Sem título"}
                </span>
                <MiniBtn danger onClick={() => removePain(i)}>
                  remover
                </MiniBtn>
              </div>
            ))}
            <MiniBtn onClick={addPain}>+ adicionar dor</MiniBtn>
          </div>

          <SectionTitle>Aparência</SectionTitle>
          <div className="grid grid-cols-[1fr_80px] items-start gap-3">
            <div>
              <Label>Cor de acento</Label>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {ACCENT_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    onClick={() => set("accent", c.value)}
                    className={`h-6 w-6 rounded-full border transition ${
                      form.accent === c.value
                        ? "border-white"
                        : "border-transparent"
                    }`}
                    style={{ background: c.value }}
                  />
                ))}
              </div>
            </div>
            <label>
              <Label>Inicial</Label>
              <input
                value={form.companyInitial}
                onChange={(e) =>
                  set("companyInitial", e.target.value.slice(0, 2))
                }
                className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-center text-sm text-ink outline-none focus:border-accent/60"
              />
            </label>
          </div>

          <div className="h-10" />
        </div>

        {/* Preview (editável) */}
        <div className="min-h-0 bg-[#0A0B0D]">
          <iframe
            title="Preview da proposta"
            srcDoc={previewHtml}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}

function SelectCard({
  on,
  onClick,
  title,
  subtitle,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
        on ? "border-accent/60 bg-accent/10" : "border-line bg-panel"
      }`}
    >
      <span
        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
          on ? "border-accent bg-accent text-bg" : "border-ink-mute text-transparent"
        }`}
      >
        ✓
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        {subtitle && (
          <span className="block truncate text-xs text-ink-mute">{subtitle}</span>
        )}
      </span>
    </button>
  );
}

function EmptyCatalog({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-ink-soft">
      Nenhum(a) {label} cadastrado(a).
      <br />
      <Link
        href="/empresa"
        className="mt-2 inline-block font-medium text-accent hover:underline"
      >
        → Cadastrar em Sua Empresa
      </Link>
    </div>
  );
}

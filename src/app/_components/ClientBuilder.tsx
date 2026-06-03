"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DEFAULT_PROPOSAL } from "@/lib/proposal/defaults";
import { renderProposalHTML, slugify } from "@/lib/proposal/render";
import type { ProposalData, Tier, InvestmentGroup } from "@/lib/proposal/types";
import { useCatalog, useConsultants } from "@/lib/catalog/store";
import type { CatalogSolution, SolutionPlan } from "@/lib/catalog/types";
import { useTemplates } from "@/lib/templates/store";
import { BLOCK_FIELDS, type BlockKey } from "@/lib/templates/types";
import type { BlockTemplate } from "@/lib/templates/types";
import { Label, TextInput, SectionTitle, MiniBtn } from "./fields";

function extractPayload(
  block: BlockKey,
  src: Partial<ProposalData>,
): Partial<ProposalData> {
  const out: Record<string, unknown> = {};
  for (const f of BLOCK_FIELDS[block]) {
    out[f] = (src as Record<string, unknown>)[f];
  }
  return out as Partial<ProposalData>;
}

type ClientForm = Omit<
  ProposalData,
  "solutions" | "investmentGroups" | "responsible" | "phone" | "email"
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

const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
function formatPtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} de ${MONTHS_PT[m - 1]} de ${y}`;
}

function toRenderSolution(s: CatalogSolution) {
  return {
    name: s.name,
    problemSolved: s.problemSolved,
    howItWorks: s.howItWorks,
    expectedBenefit: s.expectedBenefit,
    deliverables: s.deliverables,
  };
}

function planToTier(p: SolutionPlan): Tier {
  return {
    name: p.name,
    price: p.price,
    priceSuffix: p.billing === "recorrente" ? "/mês" : "",
    billing: p.billing,
    description: p.description,
    features: p.features,
    featured: p.featured,
  };
}

export default function ClientBuilder() {
  const { items: solutions, ready: solReady } = useCatalog();
  const { items: consultants, ready: consReady } = useConsultants();
  const {
    items: templates,
    add: addTemplate,
    update: updateTemplate,
  } = useTemplates();

  const [form, setForm] = useState<ClientForm>(() => {
    const {
      solutions: _s,
      investmentGroups: _ig,
      responsible: _r,
      phone: _p,
      email: _e,
      ...rest
    } = DEFAULT_PROPOSAL;
    void _s; void _ig; void _r; void _p; void _e;
    return rest;
  });

  const [selSolutions, setSelSolutions] = useState<Set<string>>(new Set());
  const [consultantId, setConsultantId] = useState<string | null>(null);
  const seededSol = useRef(false);
  const seededCons = useRef(false);
  const [dragOver, setDragOver] = useState(false);
  const [validISO, setValidISO] = useState("2026-06-29");
  const skipRender = useRef(false);

  const setValidity = (iso: string) => {
    setValidISO(iso);
    setForm((f) => ({ ...f, validUntilLabel: formatPtDate(iso) }));
  };
  const clientMissing = !form.clientName.trim() || !form.clientLegalName.trim();

  useEffect(() => {
    if (solReady && !seededSol.current) {
      seededSol.current = true;
      setSelSolutions(new Set(solutions.map((s) => s.id)));
    }
  }, [solReady, solutions]);
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
    const chosen = solutions.filter((s) => selSolutions.has(s.id));
    const investmentGroups: InvestmentGroup[] = chosen
      .filter((s) => s.plans.length > 0)
      .map((s) => ({
        solution: s.name,
        plans: s.plans.map(planToTier),
      }));
    return {
      ...form,
      solutions: chosen.map(toRenderSolution),
      investmentGroups,
      responsible: consultant?.name ?? "",
      phone: consultant?.phone ?? "",
      email: consultant?.email ?? "",
    };
  }, [form, solutions, selSolutions, consultant]);

  // ----- edição inline vinda do preview -----
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const m = e.data;
      if (!m || m.source !== "proposal-edit" || typeof m.field !== "string")
        return;
      const field: string = m.field;
      const value = String(m.value ?? "");
      skipRender.current = true;
      if (field.startsWith("pillar.")) {
        const [, i, k] = field.split(".");
        const idx = Number(i);
        setForm((f) => ({
          ...f,
          pillars: f.pillars.map((p, j) =>
            j === idx ? { ...p, [k]: value } : p,
          ),
        }));
      } else if (field.startsWith("step.")) {
        const [, i, k] = field.split(".");
        const idx = Number(i);
        setForm((f) => ({
          ...f,
          steps: f.steps.map((s, j) => (j === idx ? { ...s, [k]: value } : s)),
        }));
      } else if (field.startsWith("reason.")) {
        const [, i] = field.split(".");
        const idx = Number(i);
        setForm((f) => ({
          ...f,
          consultantRecReasons: f.consultantRecReasons.map((r, j) =>
            j === idx ? value : r,
          ),
        }));
      } else {
        setForm((f) => ({ ...f, [field]: value }) as ClientForm);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // ----- variações (templates) -----
  const applyVariation = (payload: Partial<ProposalData>) =>
    setForm((f) => ({ ...f, ...payload }) as ClientForm);
  const [saveBlock, setSaveBlock] = useState<BlockKey | null>(null);
  const [saveName, setSaveName] = useState("");
  const saveVariation = (block: BlockKey) => {
    setSaveName("Minha variação");
    setSaveBlock(block);
  };
  const confirmSave = () => {
    if (!saveBlock || !saveName.trim()) return;
    const id = addTemplate(saveBlock);
    updateTemplate(id, {
      name: saveName.trim(),
      payload: extractPayload(saveBlock, form),
    });
    setSaveBlock(null);
  };

  // ----- estrutura (listas) -----
  const addPillar = () =>
    setForm((f) => ({
      ...f,
      pillars: [...f.pillars, { title: "Novo pilar", description: "Descrição." }],
    }));
  const removePillar = (i: number) =>
    setForm((f) => ({ ...f, pillars: f.pillars.filter((_, j) => j !== i) }));
  const addStep = () =>
    setForm((f) => ({
      ...f,
      steps: [...f.steps, { title: "Novo passo", description: "Descrição." }],
    }));
  const removeStep = (i: number) =>
    setForm((f) => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }));
  const addReason = () =>
    setForm((f) => ({
      ...f,
      consultantRecReasons: [...f.consultantRecReasons, "Novo motivo."],
    }));
  const removeReason = (i: number) =>
    setForm((f) => ({
      ...f,
      consultantRecReasons: f.consultantRecReasons.filter((_, j) => j !== i),
    }));

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
    if (clientMissing) return;
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
          {clientMissing ? (
            <span className="text-amber-400/90">
              ⚠ Preencha nome da empresa e do cliente para baixar
            </span>
          ) : (
            <>
              {data.solutions.length} solução(ões) ·{" "}
              {data.investmentGroups.reduce((a, g) => a + g.plans.length, 0)}{" "}
              plano(s)
            </>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={clientMissing}
          className="rounded-full px-5 py-2 text-sm font-semibold text-bg transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: form.accent }}
        >
          ⬇ Baixar HTML
        </button>
        <a ref={exportRef} className="hidden" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,380px)_1fr]">
        {/* Painel — controles. Os textos editam-se no preview. */}
        <div className="form-scroll overflow-y-auto border-r border-line px-6 py-6">
          <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-xs leading-relaxed text-ink-soft">
            ✏️ <strong className="text-ink">Edite os textos no preview.</strong>{" "}
            Diagnóstico, custo, estratégia, recomendação e próximos passos —
            passe o mouse e clique para editar no lugar. Soluções, planos e
            consultor vêm de{" "}
            <Link href="/empresa" className="text-accent hover:underline">
              Sua Empresa
            </Link>
            .
          </div>

          <SectionTitle n={1}>Identificação</SectionTitle>
          <label className="block">
            <Label>
              Nome da empresa (capa) <span className="text-amber-400">*</span>
            </Label>
            <TextInput
              value={form.clientName}
              onChange={(v) => set("clientName", v)}
              placeholder="Ex: Magazine Luiza"
            />
          </label>
          <label className="mt-3 block">
            <Label>
              Nome do cliente <span className="text-amber-400">*</span>
            </Label>
            <TextInput
              value={form.clientLegalName}
              onChange={(v) => set("clientLegalName", v)}
              placeholder="Ex: João Silva / razão social"
            />
          </label>
          <label className="mt-3 block">
            <Label>Frase da capa (antes do nome da empresa)</Label>
            <TextInput
              value={form.coverHeadline}
              onChange={(v) => set("coverHeadline", v)}
              placeholder="Ex: Uma proposta para impulsionar a"
            />
            <span className="mt-1 block text-[11px] text-ink-mute">
              Na capa: “{form.coverHeadline || "…"} {form.clientName || "[nome da empresa]"}.”
            </span>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 flex min-h-[28px] items-center text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">
                Validade
              </span>
              <input
                type="date"
                value={validISO}
                onChange={(e) => setValidity(e.target.value)}
                className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink outline-none [color-scheme:dark] focus:border-accent/60"
              />
            </label>
            <div>
              <div className="mb-1.5 flex min-h-[28px] items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">
                  Nº proposta
                </span>
                <label className="flex shrink-0 items-center gap-1 text-[10px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={form.showProposalNumber}
                    onChange={(e) =>
                      set("showProposalNumber", e.target.checked)
                    }
                    className="accent-[var(--color-accent)]"
                  />
                  Mostrar
                </label>
              </div>
              <div className={form.showProposalNumber ? "" : "opacity-40"}>
                <TextInput
                  value={form.proposalNumber}
                  onChange={(v) => set("proposalNumber", v)}
                  placeholder="0001"
                />
              </div>
            </div>
          </div>

          <SectionTitle
            n={2}
            right={
              <EyeToggle
                on={form.showUnderstanding}
                onClick={() =>
                  set("showUnderstanding", !form.showUnderstanding)
                }
              />
            }
          >
            O que entendemos
          </SectionTitle>
          <VariationBar
            list={templates.filter((t) => t.block === "understanding")}
            onLoad={applyVariation}
            onSave={() => saveVariation("understanding")}
          />
          <p
            className={`text-xs text-ink-mute ${form.showUnderstanding ? "" : "opacity-40"}`}
          >
            Diagnóstico — situação, gargalo, oportunidade e objetivo. Edite no
            preview.
          </p>

          <SectionTitle
            n={3}
            right={
              <EyeToggle
                on={form.showCost}
                onClick={() => set("showCost", !form.showCost)}
              />
            }
          >
            O custo de continuar igual
          </SectionTitle>
          <VariationBar
            list={templates.filter((t) => t.block === "cost")}
            onLoad={applyVariation}
            onSave={() => saveVariation("cost")}
          />
          <p
            className={`text-xs text-ink-mute ${form.showCost ? "" : "opacity-40"}`}
          >
            Urgência — consequência operacional, financeira e estratégica.
            Edite no preview.
          </p>

          <SectionTitle
            n={4}
            right={
              <EyeToggle
                on={form.showStrategy}
                onClick={() => set("showStrategy", !form.showStrategy)}
              />
            }
          >
            Estratégia — pilares
          </SectionTitle>
          <VariationBar
            list={templates.filter((t) => t.block === "strategy")}
            onLoad={applyVariation}
            onSave={() => saveVariation("strategy")}
          />
          <div className={form.showStrategy ? "" : "opacity-40"}>
            <ListControl
              items={form.pillars.map((p) => p.title)}
              onAdd={addPillar}
              onRemove={removePillar}
              addLabel="+ adicionar pilar"
            />
          </div>

          <SectionTitle
            n={5}
            right={
              <EyeToggle
                on={form.showSolutions}
                onClick={() => set("showSolutions", !form.showSolutions)}
              />
            }
          >
            Soluções da proposta
          </SectionTitle>
          <VariationBar
            list={templates.filter((t) => t.block === "solutions")}
            onLoad={applyVariation}
            onSave={() => saveVariation("solutions")}
          />
          <div className={form.showSolutions ? "" : "opacity-40"}>
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
          </div>

          <SectionTitle
            n={6}
            right={
              <EyeToggle
                on={form.showInvestment}
                onClick={() => set("showInvestment", !form.showInvestment)}
              />
            }
          >
            Investimento
          </SectionTitle>
          <div
            className={`rounded-lg border border-line bg-panel p-3 text-xs leading-relaxed text-ink-soft ${form.showInvestment ? "" : "opacity-40"}`}
          >
            Os planos vêm das <strong className="text-ink">soluções</strong>{" "}
            selecionadas — cada solução traz seus planos (recorrente ou pontual).
            Edite-os em{" "}
            <Link href="/empresa" className="text-accent hover:underline">
              Sua Empresa
            </Link>
            . Título e justificativa editam-se no preview.
          </div>

          <SectionTitle
            n={7}
            right={
              <EyeToggle
                on={form.showConsultantRec}
                onClick={() =>
                  set("showConsultantRec", !form.showConsultantRec)
                }
              />
            }
          >
            Recomendação — motivos
          </SectionTitle>
          <VariationBar
            list={templates.filter((t) => t.block === "consultantRec")}
            onLoad={applyVariation}
            onSave={() => saveVariation("consultantRec")}
          />
          <div className={form.showConsultantRec ? "" : "opacity-40"}>
            <ListControl
              items={form.consultantRecReasons}
              onAdd={addReason}
              onRemove={removeReason}
              addLabel="+ adicionar motivo"
              numbered={false}
            />
          </div>

          <SectionTitle
            n={8}
            right={
              <EyeToggle
                on={form.showNextSteps}
                onClick={() => set("showNextSteps", !form.showNextSteps)}
              />
            }
          >
            Próximos passos
          </SectionTitle>
          <VariationBar
            list={templates.filter((t) => t.block === "nextSteps")}
            onLoad={applyVariation}
            onSave={() => saveVariation("nextSteps")}
          />
          <div className={form.showNextSteps ? "" : "opacity-40"}>
            <ListControl
              items={form.steps.map((s) => s.title)}
              onAdd={addStep}
              onRemove={removeStep}
              addLabel="+ adicionar passo"
            />
          </div>

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
        <div className="min-h-0 bg-bg">
          <iframe
            title="Preview da proposta"
            srcDoc={previewHtml}
            className="h-full w-full border-0"
          />
        </div>
      </div>

      {saveBlock && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSaveBlock(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-panel p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold">Salvar como variação</div>
            <p className="mt-1 text-xs text-ink-mute">
              Dê um nome para reutilizar este bloco em outras propostas.
            </p>
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmSave();
                if (e.key === "Escape") setSaveBlock(null);
              }}
              placeholder="Nome da variação"
              className="mt-3 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveBlock(null)}
                className="rounded-lg px-3 py-1.5 text-sm text-ink-soft transition hover:text-ink"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmSave}
                disabled={!saveName.trim()}
                className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-bg transition enabled:hover:opacity-90 disabled:opacity-40"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VariationBar({
  list,
  onLoad,
  onSave,
}: {
  list: BlockTemplate[];
  onLoad: (payload: Partial<ProposalData>) => void;
  onSave: () => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <select
          value=""
          onChange={(e) => {
            const t = list.find((x) => x.id === e.target.value);
            if (t) onLoad(t.payload);
          }}
          className="w-full appearance-none rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 pr-8 text-xs text-ink-soft outline-none transition hover:border-accent/40 focus:border-accent/60"
        >
          <option value="">Selecionar variação</option>
          {list.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-mute"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      <button
        type="button"
        onClick={onSave}
        title="Salvar o conteúdo atual deste bloco como nova variação"
        className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-accent/60 hover:text-accent"
      >
        Salvar atual
      </button>
    </div>
  );
}

function EyeToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={on ? "Ocultar este bloco da proposta" : "Mostrar este bloco na proposta"}
      className={`rounded-md p-1 transition ${
        on ? "text-ink-mute hover:text-ink" : "text-accent"
      }`}
    >
      {on ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M3 3l18 18" />
          <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.3 4.1" />
          <path d="M6.7 6.7A17 17 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4.3-.9" />
        </svg>
      )}
    </button>
  );
}

function ListControl({
  items,
  onAdd,
  onRemove,
  addLabel,
  numbered = true,
}: {
  items: string[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  addLabel: string;
  numbered?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="mb-1 text-xs text-ink-mute">
        Adicione/remova itens. O texto edita-se no preview.
      </p>
      {items.map((t, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2"
        >
          <span className="min-w-0 truncate text-sm">
            {numbered && (
              <span className="text-ink-mute">
                {String(i + 1).padStart(2, "0")} ·{" "}
              </span>
            )}
            {t || "Sem título"}
          </span>
          <MiniBtn danger onClick={() => onRemove(i)}>
            remover
          </MiniBtn>
        </div>
      ))}
      <MiniBtn onClick={onAdd}>{addLabel}</MiniBtn>
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

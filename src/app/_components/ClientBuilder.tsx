"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DEFAULT_PROPOSAL } from "@/lib/proposal/defaults";
import { renderProposalHTML, slugify } from "@/lib/proposal/render";
import type { ProposalData, InvestmentGroup } from "@/lib/proposal/types";
import { toRenderSolution, planToTier } from "@/lib/proposal/fromCatalog";
import { useCatalog, useConsultants } from "@/lib/catalog/store";
import { useCompany } from "@/lib/company/store";
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
  | "solutions"
  | "investmentGroups"
  | "responsible"
  | "phone"
  | "email"
  | "logo"
  | "consultantTerm"
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

export default function ClientBuilder() {
  const { items: solutions, ready: solReady } = useCatalog();
  const { items: consultants, ready: consReady } = useConsultants();
  const {
    items: templates,
    add: addTemplate,
    update: updateTemplate,
  } = useTemplates();
  const { logo: companyLogo, logoDark: companyLogoDark } = useCompany();

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

  // Campo de cor por código (hex). Rascunho local; aplica só quando vira
  // um código válido (#RGB ou #RRGGBB), pra não quebrar o acento ao digitar.
  const [hexDraft, setHexDraft] = useState(form.accent);
  useEffect(() => setHexDraft(form.accent), [form.accent]);
  const isHex = (v: string) =>
    /^#[0-9a-fA-F]{6}$/.test(v) || /^#[0-9a-fA-F]{3}$/.test(v);
  const onHexChange = (raw: string) => {
    const v = ("#" + raw.replace(/[^0-9a-fA-F]/g, "")).slice(0, 7);
    setHexDraft(v);
    if (isHex(v)) set("accent", v);
  };

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
    // Logo conforme o tema da proposta: claro → logo escura; escuro → logo clara.
    // Cai para a outra versão se só uma estiver cadastrada.
    const themedLogo =
      form.theme === "light"
        ? companyLogoDark ?? companyLogo
        : companyLogo ?? companyLogoDark;
    return {
      ...form,
      logo: themedLogo ?? undefined,
      consultantTerm: consultant?.role || "Consultor",
      solutions: chosen.map(toRenderSolution),
      investmentGroups,
      responsible: consultant?.name ?? "",
      phone: consultant?.phone ?? "",
      email: consultant?.email ?? "",
    };
  }, [form, solutions, selSolutions, consultant, companyLogo, companyLogoDark]);

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
  // Lembra qual variação foi aplicada em cada bloco (pra mostrar no seletor).
  const [selectedVar, setSelectedVar] = useState<
    Partial<Record<BlockKey, string>>
  >({});
  const applyVariation = (payload: Partial<ProposalData>) =>
    setForm((f) => ({ ...f, ...payload }) as ClientForm);
  const loadVar = (
    block: BlockKey,
    id: string,
    payload: Partial<ProposalData>,
  ) => {
    setSelectedVar((s) => ({ ...s, [block]: id }));
    applyVariation(payload);
  };
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
    setSelectedVar((s) => ({ ...s, [saveBlock]: id }));
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

  // ----- navegar o preview ao clicar no nome do bloco -----
  const previewRef = useRef<HTMLIFrameElement | null>(null);
  const scrollPreviewTo = (selector: string) => {
    const win = previewRef.current?.contentWindow;
    const doc = previewRef.current?.contentDocument;
    const el = doc?.querySelector<HTMLElement>(selector);
    if (!win || !el) return;
    // offset absoluto do elemento no documento do preview
    const top = el.getBoundingClientRect().top + win.scrollY;
    win.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    // flash rápido pra confirmar onde caiu
    el.style.transition = "outline-color .2s ease";
    el.style.outline = "2px solid var(--accent)";
    el.style.outlineOffset = "-2px";
    window.setTimeout(() => {
      el.style.outline = "";
    }, 850);
  };

  // ----- export -----
  const exportRef = useRef<HTMLAnchorElement | null>(null);
  const handleExport = () => {
    if (clientMissing) return;
    // Arquivo baixado: sem edição inline (nem hover, nem contenteditable).
    const html = renderProposalHTML(data, { editable: false });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = exportRef.current ?? document.createElement("a");
    a.href = url;
    a.download = `proposta-${slugify(data.clientName)}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // PDF: usa a impressão nativa do navegador (100% local, sem custo de API).
  // Renderiza num iframe oculto, espera as fontes e chama print() → "Salvar como PDF".
  const handleExportPDF = () => {
    if (clientMissing) return;
    const html = renderProposalHTML(data, { editable: false });
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);
    const remove = () => setTimeout(() => iframe.remove(), 1500);
    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        remove();
        return;
      }
      const doPrint = () => {
        try {
          win.focus();
          win.print();
        } catch {
          /* ignora */
        }
        remove();
      };
      const fonts = win.document?.fonts;
      if (fonts?.ready) fonts.ready.then(() => setTimeout(doPrint, 120));
      else setTimeout(doPrint, 500);
    };
    iframe.srcdoc = html;
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
        <DownloadActions
          layout="header"
          disabled={clientMissing}
          onPdf={handleExportPDF}
          onHtml={handleExport}
        />
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

          <SectionTitle n={1} onJump={() => scrollPreviewTo(".cover")}>
            Identificação
          </SectionTitle>
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
          <div className="mt-3">
            <div className="mb-1.5 flex min-h-[28px] items-center justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">
                Nº proposta
              </span>
              <label className="flex shrink-0 items-center gap-1 text-[10px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={form.showProposalNumber}
                  onChange={(e) => set("showProposalNumber", e.target.checked)}
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

          <SectionTitle
            n={2}
            onJump={() => scrollPreviewTo(".understand")}
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
            selectedId={selectedVar.understanding}
            onLoad={(id, payload) => loadVar("understanding", id, payload)}
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
            onJump={() => scrollPreviewTo(".cost")}
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
            selectedId={selectedVar.cost}
            onLoad={(id, payload) => loadVar("cost", id, payload)}
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
            onJump={() => scrollPreviewTo(".strategy")}
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
            selectedId={selectedVar.strategy}
            onLoad={(id, payload) => loadVar("strategy", id, payload)}
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
            onJump={() => scrollPreviewTo(".solutions")}
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
            selectedId={selectedVar.solutions}
            onLoad={(id, payload) => loadVar("solutions", id, payload)}
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
            onJump={() => scrollPreviewTo(".invest")}
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
            onJump={() => scrollPreviewTo(".consultant-rec")}
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
            selectedId={selectedVar.consultantRec}
            onLoad={(id, payload) => loadVar("consultantRec", id, payload)}
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
            onJump={() => scrollPreviewTo(".nextsteps")}
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
            selectedId={selectedVar.nextSteps}
            onLoad={(id, payload) => loadVar("nextSteps", id, payload)}
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

          <SectionTitle>Responsável e validade</SectionTitle>
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
                    {consultant.role ? (
                      <span className="ml-2 text-xs font-normal text-accent">
                        {consultant.role}
                      </span>
                    ) : null}
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
                Selecione um consultor no menu abaixo
              </div>
            )}
          </div>
          {consReady && consultants.length === 0 ? (
            <div className="mt-2">
              <EmptyCatalog label="consultor" />
            </div>
          ) : (
            <div className="relative mt-2">
              <select
                value={consultantId ?? ""}
                onChange={(e) => setConsultantId(e.target.value || null)}
                className="w-full appearance-none rounded-lg border border-line bg-panel-2 px-3 py-2 pr-9 text-sm text-ink-soft outline-none transition hover:border-accent/40 focus:border-accent/60"
              >
                <option value="">Selecione um consultor…</option>
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || "Sem nome"}
                    {c.role ? ` — ${c.role}` : ""}
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
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          )}

          <label className="mt-4 block">
            <Label>Proposta válida até</Label>
            <input
              type="date"
              value={validISO}
              onChange={(e) => setValidity(e.target.value)}
              className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink outline-none [color-scheme:dark] focus:border-accent/60"
            />
            <span className="mt-1 block text-[11px] text-ink-mute">
              Aparece na capa e no fechamento da proposta.
            </span>
          </label>

          <SectionTitle>Aparência</SectionTitle>
          <div className="mb-4">
            <Label>Tema do documento</Label>
            <div className="inline-flex rounded-lg border border-line p-0.5 text-xs">
              {(
                [
                  { key: "dark", label: "🌙 Escuro" },
                  { key: "light", label: "☀️ Claro" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => set("theme", t.key)}
                  className={`rounded-md px-3 py-1.5 font-medium transition ${
                    form.theme === t.key
                      ? "bg-accent text-bg"
                      : "text-ink-mute hover:text-ink-soft"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Cor de acento</Label>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {ACCENT_PRESETS.map((c) => {
                const active =
                  form.accent.toLowerCase() === c.value.toLowerCase();
                return (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    onClick={() => set("accent", c.value)}
                    className={`h-6 w-6 rounded-full border-2 transition ${
                      active
                        ? "border-white"
                        : "border-transparent hover:border-line"
                    }`}
                    style={{ background: c.value }}
                  />
                );
              })}
              {/* Cor personalizada — abre o seletor de cores do sistema */}
              <label
                title="Escolher cor personalizada"
                className="relative grid h-6 w-6 cursor-pointer place-items-center overflow-hidden rounded-full border border-line"
              >
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)",
                  }}
                />
                <span className="relative text-xs font-bold leading-none text-white mix-blend-difference">
                  +
                </span>
                <input
                  type="color"
                  value={isHex(form.accent) ? form.accent : "#C9A876"}
                  onChange={(e) => set("accent", e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Cor personalizada"
                />
              </label>
            </div>

            {/* Código da cor (hex) */}
            <div className="mt-2.5 flex items-center gap-2">
              <span
                className="h-8 w-8 shrink-0 rounded-md border border-line"
                style={{ background: isHex(form.accent) ? form.accent : "#000" }}
              />
              <input
                value={hexDraft}
                onChange={(e) => onHexChange(e.target.value)}
                placeholder="#C9A876"
                spellCheck={false}
                maxLength={7}
                className="w-28 rounded-lg border border-line bg-panel-2 px-3 py-2 font-mono text-sm uppercase text-ink outline-none transition focus:border-accent/60"
              />
              <span className="text-[11px] text-ink-mute">código hex</span>
            </div>
          </div>

          <SectionTitle>Baixar proposta</SectionTitle>
          {clientMissing && (
            <p className="mb-2.5 text-[11px] text-amber-400/90">
              ⚠ Preencha nome da empresa e do cliente para baixar.
            </p>
          )}
          <DownloadActions
            layout="panel"
            disabled={clientMissing}
            onPdf={handleExportPDF}
            onHtml={handleExport}
          />

          <div className="h-24" />
        </div>

        {/* Preview (editável) — documento contido e centralizado, com margem */}
        <div className="flex min-h-0 min-w-0 justify-center overflow-hidden bg-bg px-4">
          <iframe
            ref={previewRef}
            title="Preview da proposta"
            srcDoc={previewHtml}
            style={{ maxWidth: 860 }}
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

function DownloadActions({
  onPdf,
  onHtml,
  disabled,
  layout,
}: {
  onPdf: () => void;
  onHtml: () => void;
  disabled: boolean;
  layout: "header" | "panel";
}) {
  const header = layout === "header";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const choose = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  // Fecha ao clicar fora / Esc — SEM overlay (que travava o scroll).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${header ? "" : "w-full"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
        className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-accent font-semibold text-bg transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${
          header ? "px-5 py-2 text-sm" : "w-full px-4 py-2.5 text-sm"
        }`}
      >
        ⬇ Baixar
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          className={`absolute z-50 min-w-[170px] overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] ${
            header
              ? "right-0 top-full mt-2"
              : "left-0 bottom-full mb-2 w-full" /* painel de baixo: abre p/ cima */
          }`}
        >
          <button
            type="button"
            onClick={() => choose(onPdf)}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink transition hover:bg-panel-2"
          >
            <span>📄</span> Baixar em PDF
          </button>
          <button
            type="button"
            onClick={() => choose(onHtml)}
            className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-left text-sm text-ink transition hover:bg-panel-2"
          >
            <span>🌐</span> Baixar em HTML
          </button>
        </div>
      )}
    </div>
  );
}

function VariationBar({
  list,
  selectedId,
  onLoad,
  onSave,
}: {
  list: BlockTemplate[];
  selectedId?: string;
  onLoad: (id: string, payload: Partial<ProposalData>) => void;
  onSave: () => void;
}) {
  const selected = list.find((t) => t.id === selectedId) ?? null;
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <select
            value={selected ? selected.id : ""}
            onChange={(e) => {
              const t = list.find((x) => x.id === e.target.value);
              if (t) onLoad(t.id, t.payload);
            }}
            className={`w-full appearance-none rounded-lg border bg-panel-2 px-2.5 py-1.5 pr-8 text-xs outline-none transition focus:border-accent/60 ${
              selected
                ? "border-accent/50 font-medium text-ink"
                : "border-line text-ink-soft hover:border-accent/40"
            }`}
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
          title="Salvar o conteúdo atual deste bloco como uma nova variação"
          className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-accent/60 hover:text-accent"
        >
          Salvar novo
        </button>
      </div>
      {selected && (
        <p className="mt-1 px-0.5 text-[11px] text-ink-mute">
          Aplicada:{" "}
          <span className="font-medium text-accent">{selected.name}</span> · abra
          o menu para trocar
        </p>
      )}
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_PROPOSAL } from "@/lib/proposal/defaults";
import { renderProposalHTML, slugify } from "@/lib/proposal/render";
import type { ProposalData, InvestmentGroup } from "@/lib/proposal/types";
import { toRenderSolution, planToTier } from "@/lib/proposal/fromCatalog";
import { useCatalog, useConsultants } from "@/lib/catalog/store";
import type { CatalogSolution, Billing } from "@/lib/catalog/types";
import { useCompany } from "@/lib/company/store";
import { useTemplates } from "@/lib/templates/store";
import { BLOCK_FIELDS, type BlockKey } from "@/lib/templates/types";
import type { BlockTemplate } from "@/lib/templates/types";
import { Label, TextInput, TextArea, SectionTitle, MiniBtn } from "./fields";
import { recordDownload, getUsage, type Usage } from "@/lib/billing/usage";
import { trackGoogleConversion, GADS_CONVERSIONS } from "@/lib/analytics/google";
import { FREE_DOWNLOADS } from "@/lib/limits";

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
  const [selPlans, setSelPlans] = useState<Set<string>>(new Set());
  // Override do plano "recomendado" por solução (solId → planId; "" = nenhum).
  // Sem entrada → usa o que estiver marcado como destaque no catálogo.
  const [recById, setRecById] = useState<Record<string, string>>({});
  // Override da cobrança por proposta (planId → recorrente/pontual). Sem
  // entrada → usa a do catálogo. Deixa trocar mensal/único fácil no Gerador.
  const [billingById, setBillingById] = useState<Record<string, Billing>>({});
  const [consultantId, setConsultantId] = useState<string | null>(null);
  const seededCons = useRef(false);
  const [dragOver, setDragOver] = useState(false);
  const [validISO, setValidISO] = useState("2026-06-29");
  const skipRender = useRef(false);
  // Rolagem do preview preservada através do reload do iframe (não volta ao topo).
  const savedScroll = useRef(0);

  const setValidity = (iso: string) => {
    setValidISO(iso);
    setForm((f) => ({ ...f, validUntilLabel: formatPtDate(iso) }));
  };
  const clientMissing = !form.clientName.trim() || !form.clientLegalName.trim();

  // Por padrão, NADA vem selecionado (evita poluição) — o usuário escolhe as
  // soluções e os planos. (Consultor segue com o primeiro pré-selecionado.)
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

  const togglePlan = (id: string) =>
    setSelPlans((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Liga/desliga uma solução E os planos dela (ao ligar, entram todos por padrão).
  const toggleSolution = (s: CatalogSolution) => {
    const adding = !selSolutions.has(s.id);
    setSelSolutions((prev) => {
      const next = new Set(prev);
      if (next.has(s.id)) next.delete(s.id);
      else next.add(s.id);
      return next;
    });
    setSelPlans((prev) => {
      const next = new Set(prev);
      s.plans.forEach((p) => (adding ? next.add(p.id) : next.delete(p.id)));
      return next;
    });
  };

  // Plano recomendado vigente da solução (override do usuário ou destaque do catálogo).
  const recIdFor = (s: CatalogSolution): string | undefined =>
    s.id in recById
      ? recById[s.id] || undefined
      : s.plans.find((p) => p.featured)?.id;

  // Clique na estrela: marca como recomendado (ou remove, se já for).
  const pickRecommended = (solId: string, planId: string) =>
    setRecById((prev) => ({
      ...prev,
      [solId]: prev[solId] === planId ? "" : planId,
    }));

  // Cobrança vigente do plano (override por proposta, ou o do catálogo).
  const billingFor = (planId: string, fallback: Billing): Billing =>
    planId in billingById ? billingById[planId] : fallback;
  const setBilling = (planId: string, value: Billing) =>
    setBillingById((prev) => ({ ...prev, [planId]: value }));

  const consultant = consultants.find((c) => c.id === consultantId) ?? null;

  const data: ProposalData = useMemo(() => {
    const chosen = solutions.filter((s) => selSolutions.has(s.id));
    const investmentGroups: InvestmentGroup[] = chosen
      .map((s) => {
        const recId =
          s.id in recById
            ? recById[s.id] || undefined
            : s.plans.find((p) => p.featured)?.id;
        return {
          solution: s.name,
          plans: s.plans
            .filter((p) => selPlans.has(p.id))
            .map((p) => {
              const bill = p.id in billingById ? billingById[p.id] : p.billing;
              return {
                ...planToTier({ ...p, billing: bill }),
                featured: p.id === recId,
              };
            }),
        };
      })
      .filter((g) => g.plans.length > 0);
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
  }, [
    form,
    solutions,
    selSolutions,
    selPlans,
    recById,
    billingById,
    consultant,
    companyLogo,
    companyLogoDark,
  ]);

  // ----- edição inline vinda do preview -----
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const m = e.data;
      if (!m || m.source !== "proposal-edit") return;
      // Olhinho no preview: oculta/mostra a seção (mesmo show* do menu).
      if (typeof m.toggle === "string") {
        const key = m.toggle;
        setForm(
          (f) =>
            ({
              ...f,
              [key]: !(f as Record<string, unknown>)[key],
            }) as ClientForm,
        );
        return;
      }
      // Ações estruturais vindas do preview (add/remover pilar) — re-renderiza.
      if (m.action === "addPillar") {
        setForm((f) => ({
          ...f,
          pillars: [
            ...f.pillars,
            { title: "Novo pilar", description: "Descrição." },
          ],
        }));
        return;
      }
      if (m.action === "removePillar") {
        const idx = Number(m.index);
        setForm((f) => ({
          ...f,
          pillars: f.pillars.filter((_, j) => j !== idx),
        }));
        return;
      }
      if (typeof m.field !== "string") return;
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

  // "Salva em cima": qualquer edição num bloco com variação selecionada grava
  // o conteúdo atual sobre aquela variação (reflete no preview e na aba
  // Templates). Para preservar a original, use "Salvar novo" (cria outra).
  useEffect(() => {
    const t = setTimeout(() => {
      (Object.keys(selectedVar) as BlockKey[]).forEach((block) => {
        const id = selectedVar[block];
        if (id) updateTemplate(id, { payload: extractPayload(block, form) });
      });
    }, 700);
    return () => clearTimeout(t);
  }, [form, selectedVar, updateTemplate]);

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
    const id = setTimeout(() => {
      // Guarda a rolagem atual antes do iframe recarregar com o novo HTML.
      try {
        savedScroll.current = previewRef.current?.contentWindow?.scrollY ?? 0;
      } catch {
        /* ignora */
      }
      setPreviewHtml(renderProposalHTML(data));
    }, 300);
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

  // ----- freemium: cota de downloads -----
  // A contagem "X de 3 grátis" aparece na top-bar; aqui usamos só p/ a lógica.
  const router = useRouter();

  // Clique na logo do preview → Sua Empresa, na logo do tema atual (clara/escura).
  // Passa a intenção por sessionStorage (síncrono, antes do push) — evita corrida
  // com a URL que às vezes não abria a aba "Sua marca" de primeira.
  useEffect(() => {
    function onLogoMsg(e: MessageEvent) {
      const m = e.data;
      if (!m || m.source !== "proposal-logo") return;
      const which = m.which === "escura" ? "escura" : "clara";
      try {
        sessionStorage.setItem("kronos:marca", which);
      } catch {
        /* ignora */
      }
      router.push("/empresa");
    }
    window.addEventListener("message", onLogoMsg);
    return () => window.removeEventListener("message", onLogoMsg);
  }, [router]);
  const [usage, setUsage] = useState<Usage | null>(null);
  useEffect(() => {
    getUsage().then(setUsage).catch(() => {});
  }, []);

  // Confirmação antes de gastar 1 crédito (só para quem está no teste grátis).
  const [confirmDl, setConfirmDl] = useState<{
    run: () => void;
    format: string;
    remaining: number;
    limit: number;
  } | null>(null);

  // Portão do download: assinante baixa; free consome 1 da cota;
  // esgotado → manda pra tela de planos (pricing padrão).
  const tryDownload = async (run: () => void) => {
    if (clientMissing) return;
    try {
      const res = await recordDownload();
      setUsage(res);
      if (res.allowed) {
        run();
        // Ativação: 1ª proposta baixada com sucesso pela conta (uma única vez).
        // firstDownload é decidido no servidor (atômico) → só dispara na 1ª.
        if (res.firstDownload) {
          const fbq = (window as Window & { fbq?: (...a: unknown[]) => void })
            .fbq;
          if (typeof fbq === "function") {
            fbq("trackCustom", "BaixouPrimeiraProposta"); // Meta
          }
          trackGoogleConversion(GADS_CONVERSIONS.primeiraProposta); // Google Ads
        }
        // Avisa a top-bar pra atualizar a contagem na hora (sem reload).
        if (!res.unlimited) {
          window.dispatchEvent(
            new CustomEvent("kronos:usage", {
              detail: { remaining: res.remaining },
            }),
          );
        }
      } else {
        router.push("/planos");
      }
    } catch {
      // Em caso de erro de rede, não trava o usuário.
      run();
    }
  };

  // Clique em "Baixar PDF/HTML": assinante baixa direto; free vê a confirmação
  // (pra não gastar crédito sem ter certeza do conteúdo/estética).
  const requestDownload = async (run: () => void, format: string) => {
    if (clientMissing) return;
    let u = usage;
    if (!u) {
      try {
        u = await getUsage();
        setUsage(u);
      } catch {
        /* sem dados → trata como grátis */
      }
    }
    if (u?.unlimited) {
      tryDownload(run);
      return;
    }
    // Já esgotou → vai direto pros planos (sem modal confuso de "0 de 3").
    if ((u?.remaining ?? 0) <= 0) {
      router.push("/planos");
      return;
    }
    setConfirmDl({
      run,
      format,
      remaining: u?.remaining ?? FREE_DOWNLOADS,
      limit: u?.limit ?? FREE_DOWNLOADS,
    });
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
        <div className="flex items-center gap-3">
          <AppearanceControls
            theme={form.theme}
            onTheme={(t) => set("theme", t)}
            accent={form.accent}
            onAccent={(v) => set("accent", v)}
            hexDraft={hexDraft}
            onHexChange={onHexChange}
            isHex={isHex}
          />
          <span className="h-5 w-px bg-line" />
          <DownloadActions
            layout="header"
            disabled={clientMissing}
            onPdf={() => requestDownload(handleExportPDF, "PDF")}
            onHtml={() => requestDownload(handleExport, "HTML")}
          />
        </div>
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
              Empresa do cliente (capa){" "}
              <span className="text-amber-400">*</span>
            </Label>
            <TextInput
              value={form.clientName}
              onChange={(v) => set("clientName", v)}
              placeholder="Ex: Magazine Luiza"
            />
            <span className="mt-1 block text-[11px] text-ink-mute">
              A empresa para quem você está fazendo a proposta.
            </span>
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
            <Label>Frase da capa (antes da empresa do cliente)</Label>
            <TextInput
              value={form.coverHeadline}
              onChange={(v) => set("coverHeadline", v)}
              placeholder="Ex: Uma proposta para impulsionar a"
            />
            <span className="mt-1 block text-[11px] text-ink-mute">
              Na capa: “{form.coverHeadline || "…"} {form.clientName || "[empresa do cliente]"}.”
            </span>
          </label>
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
          <BlockFieldsEditor
            block="understanding"
            form={form}
            onField={(f, v) => set(f as keyof ClientForm, v)}
            disabled={!form.showUnderstanding}
          />

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
          <BlockFieldsEditor
            block="cost"
            form={form}
            onField={(f, v) => set(f as keyof ClientForm, v)}
            disabled={!form.showCost}
          />

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
                  Selecione quais soluções entram — e, em cada uma, quais planos
                  o cliente vê.
                </p>
                {solutions.map((s) => {
                  const on = selSolutions.has(s.id);
                  const recId = recIdFor(s);
                  return (
                    <div
                      key={s.id}
                      className={`overflow-hidden rounded-xl border transition ${
                        on
                          ? "border-accent/60 bg-accent/[0.06]"
                          : "border-line bg-panel"
                      }`}
                    >
                      {/* Cabeçalho: liga/desliga a solução */}
                      <button
                        type="button"
                        onClick={() => toggleSolution(s)}
                        className="flex w-full items-start gap-3 px-3.5 py-3 text-left"
                      >
                        <span
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[11px] transition ${
                            on
                              ? "border-accent bg-accent text-bg"
                              : "border-ink-mute/50 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">
                            {s.icon} {s.name}
                          </span>
                          {s.tagline && (
                            <span className="block truncate text-xs text-ink-mute">
                              {s.tagline}
                            </span>
                          )}
                        </span>
                      </button>

                      {/* Planos — dentro da MESMA seleção da solução */}
                      {on && (
                        <div className="border-t border-accent/20 px-3 py-3">
                          {s.plans.length === 0 ? (
                            <p className="text-[11px] text-ink-mute">
                              Sem planos. Cadastre em{" "}
                              <Link
                                href="/empresa"
                                className="text-accent hover:underline"
                              >
                                Sua Empresa
                              </Link>
                              .
                            </p>
                          ) : (
                            <>
                              <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-ink-mute">
                                Planos exibidos ao cliente
                              </p>
                              <div className="space-y-1.5">
                                {s.plans.map((p) => {
                                  const checked = selPlans.has(p.id);
                                  const rec = recId === p.id;
                                  const bill = billingFor(p.id, p.billing);
                                  return (
                                    <div
                                      key={p.id}
                                      className={`rounded-lg border px-2.5 py-2 transition ${
                                        checked
                                          ? "border-accent/40 bg-panel"
                                          : "border-line bg-panel/40"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        {/* Checkbox grande */}
                                        <button
                                          type="button"
                                          onClick={() => togglePlan(p.id)}
                                          aria-label={
                                            checked
                                              ? "Não exibir este plano"
                                              : "Exibir este plano"
                                          }
                                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition ${
                                            checked
                                              ? "border-accent bg-accent text-bg"
                                              : "border-ink-mute/50 text-transparent hover:border-accent/60"
                                          }`}
                                        >
                                          <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="h-3.5 w-3.5"
                                          >
                                            <path d="M5 13l4 4L19 7" />
                                          </svg>
                                        </button>
                                        {/* Nome + preço (clicável) */}
                                        <button
                                          type="button"
                                          onClick={() => togglePlan(p.id)}
                                          className="min-w-0 flex-1 text-left"
                                        >
                                          <span className="block truncate text-[13px] font-medium text-ink">
                                            {p.name}
                                          </span>
                                          <span className="block text-xs text-ink-mute">
                                            {p.price}
                                            {bill === "recorrente" ? "/mês" : ""}
                                          </span>
                                        </button>
                                        {/* Recomendado (clique) */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            pickRecommended(s.id, p.id)
                                          }
                                          title={
                                            rec
                                              ? "Plano recomendado (clique para remover)"
                                              : "Marcar como recomendado"
                                          }
                                          className={`shrink-0 rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${
                                            rec
                                              ? "bg-accent/15 text-accent"
                                              : "text-ink-mute hover:bg-panel-2 hover:text-accent"
                                          }`}
                                        >
                                          {rec ? "★ recomendado" : "☆"}
                                        </button>
                                      </div>

                                      {/* Cobrança: mensal x único — fácil de trocar */}
                                      {checked && (
                                        <div className="mt-2 flex items-center gap-2 pl-[34px]">
                                          <span className="text-[10px] uppercase tracking-wide text-ink-mute">
                                            Cobrança
                                          </span>
                                          <div className="inline-flex rounded-md border border-line p-0.5 text-[10px] font-medium">
                                            {(
                                              [
                                                ["recorrente", "Mensal"],
                                                ["pontual", "Único"],
                                              ] as const
                                            ).map(([val, label]) => (
                                              <button
                                                key={val}
                                                type="button"
                                                onClick={() =>
                                                  setBilling(p.id, val)
                                                }
                                                className={`rounded px-2 py-0.5 transition ${
                                                  bill === val
                                                    ? "bg-accent text-bg"
                                                    : "text-ink-mute hover:text-ink"
                                                }`}
                                              >
                                                {label}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
            Os planos exibidos são os que você{" "}
            <strong className="text-ink">marcou em cada solução</strong> acima.
            Edite preços e itens em{" "}
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
            <BlockFieldsEditor
              block="consultantRec"
              form={form}
              onField={(f, v) => set(f as keyof ClientForm, v)}
            />
            <div className="mt-2">
              <ListControl
                items={form.consultantRecReasons}
                onAdd={addReason}
                onRemove={removeReason}
                addLabel="+ adicionar motivo"
                numbered={false}
              />
            </div>
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
            <BlockFieldsEditor
              block="nextSteps"
              form={form}
              onField={(f, v) => set(f as keyof ClientForm, v)}
            />
            <div className="mt-2">
              <ListControl
                items={form.steps.map((s) => s.title)}
                onAdd={addStep}
                onRemove={removeStep}
                addLabel="+ adicionar passo"
              />
            </div>
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

          <SectionTitle>Baixar proposta</SectionTitle>
          {clientMissing && (
            <p className="mb-2.5 text-[11px] text-amber-400/90">
              ⚠ Preencha nome da empresa e do cliente para baixar.
            </p>
          )}
          <DownloadActions
            layout="panel"
            disabled={clientMissing}
            onPdf={() => requestDownload(handleExportPDF, "PDF")}
            onHtml={() => requestDownload(handleExport, "HTML")}
          />

          <div className="h-24" />
        </div>

        {/* Preview (editável) — documento contido e centralizado, com margem */}
        <div className="flex min-h-0 min-w-0 justify-center overflow-hidden bg-bg px-4">
          <iframe
            ref={previewRef}
            title="Preview da proposta"
            srcDoc={previewHtml}
            onLoad={() => {
              // Restaura a rolagem após o reload (mantém você na mesma seção).
              const y = savedScroll.current;
              if (y <= 0) return;
              const restore = () => {
                try {
                  previewRef.current?.contentWindow?.scrollTo(0, y);
                } catch {
                  /* ignora */
                }
              };
              restore();
              try {
                previewRef.current?.contentWindow?.document?.fonts?.ready.then(
                  restore,
                );
              } catch {
                /* ignora */
              }
            }}
            style={{ maxWidth: 860 }}
            className="h-full w-full border-0"
          />
        </div>
      </div>

      {confirmDl && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDl(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-semibold text-ink">
              {confirmDl.remaining <= 1
                ? "Usar seu último download grátis?"
                : "Usar 1 download grátis?"}
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              Você tem{" "}
              <strong className="text-ink">
                {confirmDl.remaining} de {confirmDl.limit}
              </strong>{" "}
              downloads grátis. Baixar em{" "}
              <strong className="text-ink">{confirmDl.format}</strong> usa{" "}
              <strong className="text-ink">1</strong>.
            </p>
            <div className="mt-3 rounded-xl border border-accent/30 bg-accent/10 p-3 text-[13px] leading-relaxed text-ink-soft">
              💡 Confira o preview à vontade — capriche no conteúdo e na estética.
              O crédito só é gasto quando você baixa.
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDl(null)}
                className="rounded-lg px-3 py-1.5 text-sm text-ink-soft transition hover:text-ink"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const run = confirmDl.run;
                  setConfirmDl(null);
                  tryDownload(run);
                }}
                className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-bg transition hover:opacity-90"
              >
                Baixar {confirmDl.format}
              </button>
            </div>
          </div>
        </div>
      )}

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

// Aparência compacta na barra do topo: toggle de tema + bolinha de cor (popover).
function AppearanceControls({
  theme,
  onTheme,
  accent,
  onAccent,
  hexDraft,
  onHexChange,
  isHex,
}: {
  theme: "dark" | "light";
  onTheme: (t: "dark" | "light") => void;
  accent: string;
  onAccent: (v: string) => void;
  hexDraft: string;
  onHexChange: (v: string) => void;
  isHex: (v: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
    <div className="flex items-center gap-2">
      {/* Tema: switch (clicar em qualquer ponto alterna escuro↔claro) */}
      <button
        type="button"
        role="switch"
        aria-checked={theme === "light"}
        title={`Tema ${theme === "dark" ? "escuro" : "claro"} — clique para alternar`}
        onClick={() => onTheme(theme === "dark" ? "light" : "dark")}
        className="relative inline-flex items-center rounded-full border border-line p-0.5"
      >
        <span
          aria-hidden
          className={`absolute top-0.5 left-0.5 h-7 w-7 rounded-full bg-accent transition-transform duration-200 ${
            theme === "light" ? "translate-x-7" : "translate-x-0"
          }`}
        />
        <span
          className={`relative z-10 grid h-7 w-7 place-items-center text-[13px] leading-none transition-opacity ${
            theme === "dark" ? "" : "opacity-50"
          }`}
        >
          🌙
        </span>
        <span
          className={`relative z-10 grid h-7 w-7 place-items-center text-[13px] leading-none transition-opacity ${
            theme === "light" ? "" : "opacity-50"
          }`}
        >
          ☀️
        </span>
      </button>

      {/* Acento: bolinha + popover */}
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="Cor de acento"
          aria-expanded={open}
          className="grid h-8 w-8 place-items-center rounded-full border border-line transition hover:border-accent/60"
        >
          <span
            className="h-4 w-4 rounded-full border border-black/15"
            style={{ background: isHex(accent) ? accent : "#000" }}
          />
        </button>
        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-line bg-panel p-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-mute">
              Cor de acento
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {ACCENT_PRESETS.map((c) => {
                const active = accent.toLowerCase() === c.value.toLowerCase();
                return (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    onClick={() => onAccent(c.value)}
                    className={`h-6 w-6 rounded-full border-2 transition ${
                      active ? "border-white" : "border-transparent hover:border-line"
                    }`}
                    style={{ background: c.value }}
                  />
                );
              })}
              <label
                title="Cor personalizada"
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
                  value={isHex(accent) ? accent : "#C9A876"}
                  onChange={(e) => onAccent(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Cor personalizada"
                />
              </label>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <span
                className="h-7 w-7 shrink-0 rounded-md border border-line"
                style={{ background: isHex(accent) ? accent : "#000" }}
              />
              <input
                value={hexDraft}
                onChange={(e) => onHexChange(e.target.value)}
                placeholder="#C9A876"
                spellCheck={false}
                maxLength={7}
                className="w-24 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 font-mono text-xs uppercase text-ink outline-none transition focus:border-accent/60"
              />
            </div>
          </div>
        )}
      </div>
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

// Rótulo + tipo de cada campo dos blocos de texto (acordeão no Gerador).
const FIELD_META: Partial<
  Record<keyof ProposalData, { label: string; area?: boolean }>
> = {
  understandingHeading: { label: "Título do bloco" },
  currentSituation: { label: "Situação atual", area: true },
  mainBottleneck: { label: "Gargalo principal", area: true },
  opportunity: { label: "Oportunidade", area: true },
  objective: { label: "Objetivo", area: true },
  costQuestion: { label: "Título do bloco" },
  costOperationalLabel: { label: "Rótulo · Operacional" },
  costOperational: { label: "Operacional", area: true },
  costFinancialLabel: { label: "Rótulo · Financeiro" },
  costFinancial: { label: "Financeiro", area: true },
  costStrategicLabel: { label: "Rótulo · Estratégico" },
  costStrategic: { label: "Estratégico", area: true },
  consultantRecHeading: { label: "Título do bloco" },
  consultantRecText: { label: "Texto da recomendação", area: true },
  nextStepsHeading: { label: "Título do bloco" },
};

// Acordeão dos campos de um bloco: clique no título → abre o texto p/ editar.
// Editar aqui altera o form (→ preview) e, se houver variação selecionada,
// salva em cima dela (ver auto-save no ClientBuilder).
function BlockFieldsEditor({
  block,
  form,
  onField,
  disabled,
}: {
  block: BlockKey;
  form: ClientForm;
  onField: (field: keyof ProposalData, value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (f: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(f)) n.delete(f);
      else n.add(f);
      return n;
    });
  const fields = BLOCK_FIELDS[block].filter((f) => FIELD_META[f]);
  return (
    <div
      className={`space-y-1.5 ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      {fields.map((f) => {
        const meta = FIELD_META[f]!;
        const isOpen = open.has(f as string);
        const value = String((form as Record<string, unknown>)[f] ?? "");
        return (
          <div
            key={f as string}
            className="overflow-hidden rounded-lg border border-line bg-panel/40"
          >
            <button
              type="button"
              onClick={() => toggle(f as string)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-3.5 w-3.5 shrink-0 text-ink-mute transition-transform ${isOpen ? "rotate-90" : ""}`}
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
              <span className="shrink-0 text-xs font-medium text-ink">
                {meta.label}
              </span>
              {!isOpen && (
                <span className="ml-auto min-w-0 truncate text-[11px] text-ink-mute">
                  {value || "vazio"}
                </span>
              )}
            </button>
            {isOpen && (
              <div className="px-3 pb-3">
                {meta.area ? (
                  <TextArea
                    value={value}
                    onChange={(v) => onField(f, v)}
                    rows={3}
                  />
                ) : (
                  <TextInput value={value} onChange={(v) => onField(f, v)} />
                )}
              </div>
            )}
          </div>
        );
      })}
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

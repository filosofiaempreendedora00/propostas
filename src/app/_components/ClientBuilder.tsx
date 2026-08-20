"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_PROPOSAL } from "@/lib/proposal/defaults";
import { renderProposalHTML, slugify } from "@/lib/proposal/render";
import type { ProposalData, InvestmentGroup } from "@/lib/proposal/types";
import TranscriptGenerator from "./TranscriptGenerator";
import UnlockLink from "./UnlockLink";
import { toRenderSolution, planToTier } from "@/lib/proposal/fromCatalog";
import { useCatalog, useConsultants } from "@/lib/catalog/store";
import type { CatalogSolution, Billing } from "@/lib/catalog/types";
import { useCompany } from "@/lib/company/store";
import { useTemplates } from "@/lib/templates/store";
import { BLOCK_FIELDS, BLOCKS, type BlockKey } from "@/lib/templates/types";
import type { BlockTemplate } from "@/lib/templates/types";
import { Label, TextInput, TextArea, SectionTitle, MiniBtn } from "./fields";
import { recordDownload, getUsage, type Usage } from "@/lib/billing/usage";
import {
  trackGoogleConversion,
  trackFunnel,
  GADS_CONVERSIONS,
} from "@/lib/analytics/google";

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

const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
function formatPtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} de ${MONTHS_PT[m - 1]} de ${y}`;
}

// Passos do onboarding 1 → 2 → 3, sempre visíveis. `current` = passo atual
// (os anteriores viram ✓; o atual fica em destaque; os próximos, apagados).
function Stepper({ current }: { current: 2 | 3 }) {
  const steps = [
    { n: 1, label: "Descreva" },
    { n: 2, label: "Cliente" },
    { n: 3, label: "Baixe (grátis)" },
  ];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-semibold">
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <Fragment key={s.n}>
            {i > 0 && (
              <span aria-hidden className="text-ink-mute">
                →
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                active
                  ? "border border-accent bg-accent text-bg"
                  : done
                    ? "bg-accent/25 text-ink"
                    : "border border-line text-ink-mute"
              }`}
            >
              {done && <span aria-hidden>✓</span>} {s.n} · {s.label}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

// Máscara de moeda BRL para o campo de preço. Aceita o que a pessoa digita e
// devolve "R$ 7.000". Digitar "7000" → "R$ 7.000"; "7000,5" → "R$ 7.000,5".
// A finalização (no blur) garante as 2 casas → "R$ 7.000,00".
function maskBRL(raw: string): string {
  const s = raw.replace(/[R$\s.]/g, "").replace(/[^\d,]/g, "");
  const ci = s.indexOf(",");
  let intPart = ci === -1 ? s : s.slice(0, ci);
  const decPart =
    ci === -1 ? "" : s.slice(ci + 1).replace(/,/g, "").slice(0, 2);
  intPart = intPart.replace(/^0+(?=\d)/, "");
  if (!intPart && ci === -1) return "";
  const intFmt = (intPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return ci === -1 ? `R$ ${intFmt}` : `R$ ${intFmt},${decPart}`;
}
// No blur: completa as 2 casas decimais (7000 → R$ 7.000,00).
function finalizeBRL(value: string): string {
  const masked = maskBRL(value);
  if (!masked) return "";
  const ci = masked.indexOf(",");
  if (ci === -1) return `${masked},00`;
  return masked.slice(0, ci + 1) + (masked.slice(ci + 1) + "00").slice(0, 2);
}
// Preço para EXIBIR: numérico ganha as 2 casas (R$ 2.997 → R$ 2.997,00);
// texto sem número (ex.: "Sob consulta") é preservado como está.
function displayPrice(raw: string): string {
  return maskBRL(raw) ? finalizeBRL(raw) : raw;
}

export default function ClientBuilder() {
  const { items: solutions, ready: solReady } = useCatalog();
  const { items: consultants, ready: consReady } = useConsultants();
  const {
    items: templates,
    ready: templatesReady,
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
  // Override do preço por proposta (planId → "R$ X.XXX,XX"). Sem entrada → usa
  // o preço do catálogo. Deixa a pessoa ajustar o valor antes de baixar.
  const [priceById, setPriceById] = useState<Record<string, string>>({});
  const [consultantId, setConsultantId] = useState<string | null>(null);
  const seededCons = useRef(false);
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

  // Preço vigente do plano (override por proposta, ou o do catálogo).
  const priceFor = (planId: string, fallback: string): string =>
    planId in priceById ? priceById[planId] : fallback;
  const setPrice = (planId: string, value: string) =>
    setPriceById((prev) => ({ ...prev, [planId]: value }));

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
              const priceRaw = p.id in priceById ? priceById[p.id] : p.price;
              return {
                ...planToTier({ ...p, billing: bill, price: displayPrice(priceRaw) }),
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
    priceById,
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
  // Suprime UM ciclo de save logo após o auto-seed das variações (senão
  // regravaria os 6 blocos, idênticos, em todo carregamento do gerador).
  const skipSeedSave = useRef(false);
  useEffect(() => {
    if (skipSeedSave.current) {
      skipSeedSave.current = false;
      return;
    }
    const t = setTimeout(() => {
      (Object.keys(selectedVar) as BlockKey[]).forEach((block) => {
        const id = selectedVar[block];
        if (id) updateTemplate(id, { payload: extractPayload(block, form) });
      });
    }, 700);
    return () => clearTimeout(t);
  }, [form, selectedVar, updateTemplate]);

  // ----- onboarding guiado -----
  // `onboarding` = veio da geração por IA (?bemvindo) → mostra o banner "a IA
  // escreveu". `firstRun` = conta ainda NÃO baixou a 1ª proposta → o Gerador
  // fica SEMPRE pronto/baixável (mesmo voltando pela navegação normal, sem o
  // param), pra não recair no botão cinza / beco sem saída antes da ativação.
  const [onboarding, setOnboarding] = useState(false);
  const [firstRun, setFirstRun] = useState(false);
  const [onbDismissed, setOnbDismissed] = useState(false);
  useEffect(() => {
    let onb = false;
    let done = false;
    try {
      onb =
        new URLSearchParams(window.location.search).get("bemvindo") === "1";
      done = localStorage.getItem("kronos:onb") === "done";
    } catch {
      /* ignora */
    }
    setOnboarding(onb);
    setFirstRun(onb || !done);
    // Só esconde o banner-guia pra quem já ativou E NÃO veio explicitamente do
    // onboarding. Com ?bemvindo=1 (emenda da geração por IA) o guia SEMPRE
    // aparece — senão o localStorage "done" (por domínio) matava o banner numa
    // conta que acabou de gerar (bug localhost×produção).
    if (done && !onb) setOnbDismissed(true);
    trackFunnel("chegou_ao_gerador", onb ? { via: "ia" } : {});
  }, []);

  // Aplica a variação PADRÃO (a 1ª de cada bloco) no 1º carregamento — assim a
  // proposta já nasce com o conteúdo real da org (o que a IA escreveu, ou o
  // texto de exemplo), em vez dos defaults soltos.
  const seededVars = useRef(false);
  useEffect(() => {
    if (seededVars.current || !templatesReady || templates.length === 0) return;
    seededVars.current = true;
    const picks: Partial<Record<BlockKey, string>> = {};
    const patch: Record<string, unknown> = {};
    for (const b of BLOCKS) {
      const first = templates.find((t) => t.block === b.key);
      if (!first) continue;
      picks[b.key] = first.id;
      Object.assign(patch, first.payload);
    }
    skipSeedSave.current = true; // não regravar o que acabou de ser aplicado
    setSelectedVar((s) => ({ ...picks, ...s })); // não sobrescreve escolha manual
    setForm((f) => ({ ...f, ...patch }) as ClientForm);
  }, [templatesReady, templates]);

  // Onboarding: seleciona TODAS as soluções e seus planos → o preview nasce
  // cheio, a proposta inteira já montada. (No uso normal nada vem marcado.)
  // NÃO pré-enche o cliente: baixar com nome falso queimaria um crédito numa
  // proposta-lixo (o PDF não dá pra editar depois). O nome do cliente é pedido
  // na frente, no banner, ANTES do download → a 1ª proposta já sai real.
  const seededOnb = useRef(false);
  useEffect(() => {
    if (!firstRun || seededOnb.current || !solReady || solutions.length === 0)
      return;
    seededOnb.current = true;
    setSelSolutions(new Set(solutions.map((s) => s.id)));
    setSelPlans(new Set(solutions.flatMap((s) => s.plans.map((p) => p.id))));
    trackFunnel("proposal_ready", { via: onboarding ? "ia" : "firstrun" });
  }, [firstRun, onboarding, solReady, solutions]);

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
  const setPillar = (i: number, patch: Partial<{ title: string; description: string }>) =>
    setForm((f) => ({
      ...f,
      pillars: f.pillars.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    }));
  const setStep = (i: number, patch: Partial<{ title: string; description: string }>) =>
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }));
  const setReason = (i: number, value: string) =>
    setForm((f) => ({
      ...f,
      consultantRecReasons: f.consultantRecReasons.map((r, j) =>
        j === i ? value : r,
      ),
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

  // Clique na logo do preview → Minha Empresa, na aba "Minha marca", já destacando
  // a logo do tema atual (clara/escura). A intenção vai por QUERY PARAM (?marca=)
  // — determinístico ao montar a página (não some sob StrictMode como o
  // sessionStorage consumido, que abria a aba errada de primeira).
  useEffect(() => {
    function onLogoMsg(e: MessageEvent) {
      const m = e.data;
      if (!m || m.source !== "proposal-logo") return;
      const which = m.which === "escura" ? "escura" : "clara";
      router.push(`/empresa?marca=${which}`);
    }
    window.addEventListener("message", onLogoMsg);
    return () => window.removeEventListener("message", onLogoMsg);
  }, [router]);
  const [usage, setUsage] = useState<Usage | null>(null);
  useEffect(() => {
    getUsage().then(setUsage).catch(() => {});
  }, []);

  // Modal pós-download GRÁTIS (marca d'água): mostra que saiu com marca e
  // oferece o desbloqueio (assinar → baixar limpo).
  const [celebrate, setCelebrate] = useState(false);
  // Como montar a proposta: pela call (transcript, default) ou por templates.
  const [fillMode, setFillMode] = useState<"transcript" | "templates">(
    "transcript",
  );
  // Accordion dos blocos: começam MINIMIZADOS (menos poluição). Só Identificação
  // vem aberta. Clicar no título expande/recolhe; ao EXPANDIR, leva o preview até
  // a seção (não conflita com o "ver no preview", que continua no expandir).
  const [openSecs, setOpenSecs] = useState<Set<string>>(new Set());
  const toggleSec = (key: string, jump?: () => void) =>
    setOpenSecs((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else {
        n.add(key);
        jump?.();
      }
      return n;
    });
  // Preços começam MINIMIZADOS por plano (só um chip com o valor); "editar" abre
  // o input + cobrança. Menos poluição e números menos "grosseiros".
  const [priceOpen, setPriceOpen] = useState<Set<string>>(new Set());
  const togglePriceEdit = (id: string) =>
    setPriceOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  // Aplica no form os blocos personalizados que a IA extraiu do transcript da
  // call (Item 5). O catálogo de soluções continua vindo do negócio.
  const applyTranscriptBlocks = (
    clientName: string,
    blocks: Partial<ProposalData>,
  ) => {
    setForm((f) => ({
      ...f,
      ...(blocks as Partial<ClientForm>),
      clientName: clientName.trim() || f.clientName,
    }));
  };

  // Flash sutil, sem lib (o app não tem toast). Some sozinho.
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  // Rola até o campo de cliente, foca e avisa — SEM tracking. Reusado pelo guia
  // de "cliente vazio" (bloqueio) e pelo nudge positivo pós-exemplo.
  const scrollToClientField = (msg: string) => {
    const el = document.getElementById("cliente-sec");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    flash(msg);
  };

  // Cliente vazio → em vez de o botão ficar mudo, GUIA pro campo (e loga o bloqueio).
  const focusClientField = () => {
    trackFunnel("download_blocked", { reason: "cliente_vazio" });
    scrollToClientField("Diga pra quem é a proposta 👇");
  };

  // ----- export (modelo MARCA D'ÁGUA) -----
  const exportRef = useRef<HTMLAnchorElement | null>(null);
  const isPaid = !!usage?.unlimited; // assinante → download limpo

  // Baixa como .html (com ou sem marca d'água).
  const handleExport = (watermark: boolean) => {
    if (clientMissing) return;
    const html = renderProposalHTML(data, { editable: false, watermark });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = exportRef.current ?? document.createElement("a");
    a.href = url;
    a.download = `proposta-${slugify(data.clientName)}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // PDF via impressão nativa (iframe oculto). `watermark` liga a marca d'água.
  const printProposalPDF = (d: ProposalData, watermark: boolean) => {
    const html = renderProposalHTML(d, { editable: false, watermark });
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
  const handleExportPDF = (watermark: boolean) => {
    if (clientMissing) return;
    printProposalPDF(data, watermark);
  };

  // Download: SEMPRE liberado (sem cap/paywall). Assinante = LIMPO; free = com
  // MARCA D'ÁGUA + oferta de desbloqueio. Registra e dispara os eventos.
  const doDownload = async (format: "PDF" | "HTML") => {
    if (clientMissing) {
      focusClientField();
      return;
    }
    trackFunnel("download_attempt", { format });

    // Confirma se é assinante (pode não ter carregado ainda) → decide a marca.
    let u = usage;
    if (!u) {
      try {
        u = await getUsage();
        setUsage(u);
      } catch {
        /* sem dados → trata como free (marca d'água) */
      }
    }
    const watermark = !u?.unlimited;

    if (format === "PDF") handleExportPDF(watermark);
    else handleExport(watermark);

    trackFunnel("download_success", { format, watermark });
    if (watermark) trackFunnel("watermark_download", { format });

    try {
      const res = await recordDownload();
      setUsage(res);
      // Ativação: 1ª proposta baixada pela conta (uma vez só; server-atômico).
      if (res.firstDownload) {
        const fbq = (window as Window & { fbq?: (...a: unknown[]) => void }).fbq;
        if (typeof fbq === "function") fbq("trackCustom", "BaixouPrimeiraProposta");
        trackGoogleConversion(GADS_CONVERSIONS.primeiraProposta);
        try {
          localStorage.setItem("kronos:onb", "done");
        } catch {
          /* ignora */
        }
        setOnbDismissed(true);
      }
    } catch {
      /* rede: já baixou localmente, não trava */
    }

    // Momento do download grátis → oferece o desbloqueio (modal com CTA tracked).
    if (watermark) setCelebrate(true);
  };

  // ----- consultor: drag & drop -----
  return (
    <div className="flex h-full flex-col">
      {/* Flash sutil (ex.: guia pro campo de cliente ao clicar Baixar vazio) */}
      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-16 z-[60] -translate-x-1/2">
          <div className="rounded-full border border-accent/50 bg-panel px-4 py-2 text-sm font-semibold text-ink shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)]">
            {toast}
          </div>
        </div>
      )}
      {/* Sub-header */}
      <div className="flex items-center justify-between border-b border-line px-6 py-2.5">
        <div className="text-[11px] text-ink-mute">
          {clientMissing ? (
            <button
              type="button"
              onClick={focusClientField}
              className="cursor-pointer text-amber-400/90 underline-offset-2 transition hover:underline"
            >
              ⚠ Falta o nome do cliente pra baixar — clique aqui
            </button>
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
          {/* Sinal inconfundível de que dá pra baixar — junto do botão, não
              dependendo mais da setinha sutil. Aparece quando os obrigatórios
              estão completos (cohort de 1ª vez). */}
          {firstRun && !clientMissing && (
            <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-accent/50 bg-accent/15 px-3 py-1.5 text-[13px] font-bold text-accent lg:inline-flex">
              <span aria-hidden>✓</span> Tudo pronto — baixe
              <span aria-hidden>→</span>
            </span>
          )}
          <DownloadActions
            layout="header"
            blocked={clientMissing}
            onBlocked={focusClientField}
            highlight={firstRun && !clientMissing}
            onPdf={() => doDownload("PDF")}
            onHtml={() => doDownload("HTML")}
          />
        </div>
        <a ref={exportRef} className="hidden" />
      </div>

      {/* Onboarding: pede o nome do cliente NA FRENTE (não como gate tardio) →
          a 1ª proposta já sai REAL, sem queimar crédito com exemplo. */}
      {firstRun && !onbDismissed && (
        <div
          className={`px-6 py-3.5 ${
            clientMissing
              ? "border-b-2 border-accent bg-accent/[0.13]"
              : "border-b-2 border-accent/70 bg-accent/[0.11]"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {clientMissing ? (
                <>
                  <span className="grid h-9 w-9 shrink-0 animate-bounce place-items-center rounded-full bg-accent text-lg font-bold text-bg">
                    ↓
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-ink-soft sm:text-[15px]">
                      <span className="font-semibold text-ink">
                        Montei um rascunho a partir do seu catálogo.
                      </span>{" "}
                      Pra ficar sob medida: diga{" "}
                      <strong className="text-ink">pra quem é</strong> abaixo — e,
                      se tiver,{" "}
                      <strong className="text-ink">traga a call</strong> acima pra
                      a IA usar as dores reais do cliente. Depois é só baixar.
                    </p>
                    <Stepper current={2} />
                  </div>
                </>
              ) : (
                <>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-lg">
                    🎉
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug text-ink-soft sm:text-base">
                      <span className="font-semibold text-ink">
                        Tudo pronto para {form.clientName || "seu cliente"}!
                      </span>{" "}
                      Agora é só clicar em{" "}
                      <strong className="text-ink">Baixar</strong>{" "}
                      <span className="font-semibold text-accent">
                        ali em cima
                      </span>{" "}
                      <span className="inline-block animate-bounce font-bold text-accent">
                        ↗
                      </span>{" "}
                      — sua 1ª proposta é grátis.
                    </p>
                    <Stepper current={3} />
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOnbDismissed(true)}
              className="shrink-0 cursor-pointer rounded-lg border border-line px-2.5 py-1 text-[11px] text-ink-mute transition hover:text-ink"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,380px)_1fr]">
        {/* Painel — controles. Os textos editam-se no preview. */}
        <div className="form-scroll overflow-y-auto border-r border-line px-6 py-6">
          {/* Item 5 — como montar: pela CALL (transcript, recomendado) ou por
              TEMPLATES. O switcher fica acima do quadro "Edite os textos". */}
          <div className="mb-3">
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-mute">
              Como montar a proposta
            </div>
            <div className="mb-2.5 flex rounded-xl border border-line bg-panel/40 p-1 text-[13px]">
              {(
                [
                  ["transcript", "🎙️ Pela call (IA)"],
                  ["templates", "Templates"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setFillMode(mode);
                    trackFunnel("fillmode_selected", { mode });
                  }}
                  className={`flex-1 rounded-lg px-3 py-2.5 font-semibold transition ${
                    fillMode === mode
                      ? "bg-accent text-bg shadow-sm"
                      : "text-ink-mute hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {fillMode === "transcript" ? (
              <TranscriptGenerator onApply={applyTranscriptBlocks} />
            ) : (
              <p className="rounded-lg border border-line bg-panel/50 px-3 py-2.5 text-[12px] leading-relaxed text-ink-soft">
                Use as{" "}
                <strong className="text-ink">variações de texto</strong> nos
                blocos abaixo (menu “Selecionar variação”) — o padrão pra quem
                reaproveita argumentos. Ou gerencie tudo em{" "}
                <Link href="/templates" className="text-accent hover:underline">
                  Templates
                </Link>
                .
              </p>
            )}
          </div>

          <SectionTitle n={1} onJump={() => scrollPreviewTo(".cover")}>
            Identificação
          </SectionTitle>
          <label className="block" id="cliente-sec">
            <Label>
              Empresa do cliente (capa){" "}
              <span className="text-amber-400">*</span>
              {firstRun && !form.clientName.trim() && (
                <span className="mt-2 flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[13px] font-bold normal-case tracking-normal text-bg shadow-[0_2px_12px_-2px_var(--accent)]">
                  comece aqui
                  <span className="inline-block animate-bounce text-base leading-none">↓</span>
                </span>
              )}
            </Label>
            <TextInput
              value={form.clientName}
              onChange={(v) => set("clientName", v)}
              placeholder="Ex: Magazine Luiza"
              highlight={firstRun && !form.clientName.trim()}
            />
            <span className="mt-1 block text-[11px] text-ink-mute">
              A empresa para quem você está fazendo a proposta.
            </span>
          </label>
          <label className="mt-3 block">
            <Label>
              Nome do cliente <span className="text-amber-400">*</span>
              {firstRun &&
                form.clientName.trim() !== "" &&
                !form.clientLegalName.trim() && (
                  <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 align-middle text-[13px] font-bold normal-case tracking-normal text-bg shadow-[0_2px_12px_-2px_var(--accent)]">
                    agora aqui
                    <span className="inline-block animate-bounce text-base leading-none">↓</span>
                  </span>
                )}
            </Label>
            <TextInput
              value={form.clientLegalName}
              onChange={(v) => set("clientLegalName", v)}
              placeholder="Ex: João Silva / razão social"
              highlight={firstRun && !form.clientLegalName.trim()}
            />
          </label>
          {/* Próximo passo: preenchido o cliente, aponta pra conferir + Baixar
              (onde antes ficavam as setas → fecha a lacuna do fluxo). */}
          {firstRun && !clientMissing && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent/50 bg-accent/[0.1] p-3">
              <span className="text-lg leading-none" aria-hidden>
                ✅
              </span>
              <p className="text-[13px] leading-snug text-ink-soft">
                <strong className="text-ink">Cliente definido!</strong> Confira a
                proposta no preview ao lado e clique em{" "}
                <strong className="text-ink">Baixar</strong>{" "}
                <span className="inline-block animate-bounce font-bold text-accent">
                  ↗
                </span>{" "}
                lá no topo — sua 1ª proposta é grátis.
              </p>
            </div>
          )}
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
            open={openSecs.has("understanding")}
            onToggle={() =>
              toggleSec("understanding", () => scrollPreviewTo(".understand"))
            }
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
          {openSecs.has("understanding") && (
            <>
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
            </>
          )}

          <SectionTitle
            n={3}
            open={openSecs.has("cost")}
            onToggle={() => toggleSec("cost", () => scrollPreviewTo(".cost"))}
            right={
              <EyeToggle
                on={form.showCost}
                onClick={() => set("showCost", !form.showCost)}
              />
            }
          >
            O custo de continuar igual
          </SectionTitle>
          {openSecs.has("cost") && (
            <>
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
            </>
          )}

          <SectionTitle
            n={4}
            open={openSecs.has("strategy")}
            onToggle={() =>
              toggleSec("strategy", () => scrollPreviewTo(".strategy"))
            }
            right={
              <EyeToggle
                on={form.showStrategy}
                onClick={() => set("showStrategy", !form.showStrategy)}
              />
            }
          >
            Estratégia — pilares
          </SectionTitle>
          {openSecs.has("strategy") && (
            <>
              <VariationBar
                list={templates.filter((t) => t.block === "strategy")}
                selectedId={selectedVar.strategy}
                onLoad={(id, payload) => loadVar("strategy", id, payload)}
                onSave={() => saveVariation("strategy")}
              />
              <div className={form.showStrategy ? "" : "opacity-40"}>
                <TitleDescEditor
                  items={form.pillars}
                  onItem={setPillar}
                  onAdd={addPillar}
                  onRemove={removePillar}
                  addLabel="+ adicionar pilar"
                />
              </div>
            </>
          )}

          <SectionTitle
            n={5}
            open={openSecs.has("solutions")}
            onToggle={() =>
              toggleSec("solutions", () => scrollPreviewTo(".solutions"))
            }
            right={
              <EyeToggle
                on={form.showSolutions}
                onClick={() => set("showSolutions", !form.showSolutions)}
              />
            }
          >
            Soluções da proposta
          </SectionTitle>
          {openSecs.has("solutions") && (
          <>
          <VariationBar
            list={templates.filter((t) => t.block === "solutions")}
            selectedId={selectedVar.solutions}
            onLoad={(id, payload) => loadVar("solutions", id, payload)}
            onSave={() => saveVariation("solutions")}
          />
          <div className={form.showSolutions ? "" : "opacity-40"}>
            {solReady && solutions.length === 0 ? (
              <NoCatalogNotice />
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
                      {/* Cabeçalho: liga/desliga a solução + ✏️ editar conteúdo.
                          O ✏️ leva ao catálogo focado nesta solução (edita nome,
                          textos, entregáveis — não só o preço). */}
                      <div
                        className={`flex items-stretch ${
                          on ? "border-b border-accent/25" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSolution(s)}
                          className="flex min-w-0 flex-1 items-start gap-3 px-3.5 py-3 text-left"
                        >
                          <span
                            className={`mt-0.5 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg border-2 text-[15px] font-bold transition ${
                              on
                                ? "border-accent bg-accent text-bg"
                                : "border-ink-mute/50 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-semibold leading-tight text-ink">
                              {s.icon} {s.name}
                            </span>
                            {s.tagline && (
                              <span className="mt-0.5 block truncate text-xs text-ink-mute">
                                {s.tagline}
                              </span>
                            )}
                          </span>
                        </button>
                        <Link
                          href={`/empresa?sol=${s.id}`}
                          title="Editar o conteúdo desta solução em Minha Empresa"
                          onClick={(e) => e.stopPropagation()}
                          className="flex shrink-0 items-center self-stretch px-3 text-ink-mute/50 transition hover:text-accent"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                            aria-hidden
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </Link>
                      </div>

                      {/* Planos — sub-área nitidamente subordinada (fundo
                          próprio), pra não parecer "outra caixa igual" à solução. */}
                      {on && (
                        <div className="bg-panel-2/40 px-3 py-3">
                          {s.plans.length === 0 ? (
                            <p className="text-[11px] text-ink-mute">
                              Sem planos. Cadastre em{" "}
                              <Link
                                href="/empresa"
                                className="text-accent hover:underline"
                              >
                                Minha Empresa
                              </Link>
                              .
                            </p>
                          ) : (
                            <>
                              <p className="text-[10px] font-medium uppercase tracking-wide text-ink-mute">
                                Planos exibidos ao cliente
                              </p>
                              <p className="mb-2 mt-0.5 text-[11px] leading-snug text-ink-mute">
                                Ajuste o <strong className="text-ink">preço</strong>{" "}
                                de cada plano. A{" "}
                                <span className="text-accent">★ estrela</span>{" "}
                                marca o plano que você{" "}
                                <strong className="text-ink">recomenda</strong> —
                                ele sai em destaque pro cliente.
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
                                          className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded border transition ${
                                            checked
                                              ? "border-accent/70 bg-accent/80 text-bg"
                                              : "border-ink-mute/40 text-transparent hover:border-accent/60"
                                          }`}
                                        >
                                          <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3.2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="h-2.5 w-2.5"
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
                                          {!checked && (
                                            <span className="block text-xs text-ink-mute">
                                              {displayPrice(priceFor(p.id, p.price))}
                                              {bill === "recorrente" ? "/mês" : ""}
                                            </span>
                                          )}
                                        </button>
                                        {/* Recomendado (clique) — rótulo explícito */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            pickRecommended(s.id, p.id)
                                          }
                                          title={
                                            rec
                                              ? "Plano recomendado — clique para remover o destaque"
                                              : "Marcar como o plano recomendado (destaque na proposta)"
                                          }
                                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                                            rec
                                              ? "border-accent bg-accent text-bg"
                                              : "border-line text-ink-mute hover:border-accent/60 hover:text-accent"
                                          }`}
                                        >
                                          {rec ? "★ Recomendado" : "☆ Recomendar"}
                                        </button>
                                      </div>

                                      {/* Preço MINIMIZADO por padrão: um chip com
                                          o valor; "editar" abre o input + cobrança. */}
                                      {checked && (
                                        <div className="mt-2 pl-[30px]">
                                          {!priceOpen.has(p.id) ? (
                                            <button
                                              type="button"
                                              onClick={() => togglePriceEdit(p.id)}
                                              className="inline-flex items-baseline gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 transition hover:border-accent/50"
                                            >
                                              <span className="text-[15px] font-semibold tracking-tight text-ink">
                                                {displayPrice(priceFor(p.id, p.price))}
                                              </span>
                                              <span className="text-[11px] text-ink-mute">
                                                {bill === "recorrente" ? "/mês" : "único"}
                                              </span>
                                              <span className="ml-1.5 text-[11px] font-medium text-accent">
                                                editar
                                              </span>
                                            </button>
                                          ) : (
                                            <div className="space-y-2">
                                              <label className="block">
                                                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-mute">
                                                  Preço{" "}
                                                  {bill === "recorrente"
                                                    ? "(por mês)"
                                                    : "(único)"}
                                                </span>
                                                <input
                                                  autoFocus
                                                  value={
                                                    p.id in priceById
                                                      ? priceById[p.id]
                                                      : displayPrice(p.price)
                                                  }
                                                  onChange={(e) =>
                                                    setPrice(p.id, maskBRL(e.target.value))
                                                  }
                                                  onBlur={(e) =>
                                                    setPrice(p.id, finalizeBRL(e.target.value))
                                                  }
                                                  inputMode="numeric"
                                                  placeholder="R$ 0,00"
                                                  className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-base font-semibold tracking-tight text-ink outline-none transition placeholder:text-ink-mute/60 focus:border-accent/70"
                                                />
                                              </label>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] uppercase tracking-wide text-ink-mute">
                                                  Investimento
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
                                                      onClick={() => setBilling(p.id, val)}
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
                                                <button
                                                  type="button"
                                                  onClick={() => togglePriceEdit(p.id)}
                                                  className="ml-auto rounded-md px-2 py-0.5 text-[11px] font-semibold text-accent transition hover:bg-accent/10"
                                                >
                                                  ok
                                                </button>
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
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </>
          )}

          <SectionTitle
            n={6}
            open={openSecs.has("invest")}
            onToggle={() => toggleSec("invest", () => scrollPreviewTo(".invest"))}
            right={
              <EyeToggle
                on={form.showInvestment}
                onClick={() => set("showInvestment", !form.showInvestment)}
              />
            }
          >
            Investimento
          </SectionTitle>
          {openSecs.has("invest") && (
          <div
            className={`rounded-lg border border-line bg-panel p-3 text-xs leading-relaxed text-ink-soft ${form.showInvestment ? "" : "opacity-40"}`}
          >
            Os planos exibidos são os que você{" "}
            <strong className="text-ink">marcou em cada solução</strong> acima.
            Edite preços e itens em{" "}
            <Link href="/empresa" className="text-accent hover:underline">
              Minha Empresa
            </Link>
            . Título e justificativa editam-se no preview.
          </div>
          )}

          <SectionTitle
            n={7}
            open={openSecs.has("rec")}
            onToggle={() =>
              toggleSec("rec", () => scrollPreviewTo(".consultant-rec"))
            }
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
          {openSecs.has("rec") && (
            <div className={form.showConsultantRec ? "" : "opacity-40"}>
              <VariationBar
                list={templates.filter((t) => t.block === "consultantRec")}
                selectedId={selectedVar.consultantRec}
                onLoad={(id, payload) => loadVar("consultantRec", id, payload)}
                onSave={() => saveVariation("consultantRec")}
              />
              <BlockFieldsEditor
                block="consultantRec"
                form={form}
                onField={(f, v) => set(f as keyof ClientForm, v)}
              />
              <div className="mt-2">
                <StringListEditor
                  items={form.consultantRecReasons}
                  onItem={setReason}
                  onAdd={addReason}
                  onRemove={removeReason}
                  addLabel="+ adicionar motivo"
                />
              </div>
            </div>
          )}

          <SectionTitle
            n={8}
            open={openSecs.has("nextSteps")}
            onToggle={() =>
              toggleSec("nextSteps", () => scrollPreviewTo(".nextsteps"))
            }
            right={
              <EyeToggle
                on={form.showNextSteps}
                onClick={() => set("showNextSteps", !form.showNextSteps)}
              />
            }
          >
            Próximos passos
          </SectionTitle>
          {openSecs.has("nextSteps") && (
            <div className={form.showNextSteps ? "" : "opacity-40"}>
              <VariationBar
                list={templates.filter((t) => t.block === "nextSteps")}
                selectedId={selectedVar.nextSteps}
                onLoad={(id, payload) => loadVar("nextSteps", id, payload)}
                onSave={() => saveVariation("nextSteps")}
              />
              <BlockFieldsEditor
                block="nextSteps"
                form={form}
                onField={(f, v) => set(f as keyof ClientForm, v)}
              />
              <div className="mt-2">
                <TitleDescEditor
                  items={form.steps}
                  onItem={setStep}
                  onAdd={addStep}
                  onRemove={removeStep}
                  addLabel="+ adicionar passo"
                />
              </div>
            </div>
          )}

          <SectionTitle>Responsável e validade</SectionTitle>
          <div>
            <Label>Consultor responsável</Label>
            {consReady && consultants.length === 0 ? (
              /* Sem consultor ainda → leva direto pra criar na tela de Consultores. */
              <Link
                href="/empresa?tab=consultores"
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-accent/45 bg-accent/[0.07] px-3 py-3 text-sm font-semibold text-accent transition hover:border-accent hover:bg-accent/[0.12]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="h-4 w-4"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Criar meu consultor
              </Link>
            ) : (
              <div className="flex items-stretch gap-2">
                {/* Só o seletor (sem card duplicado), com ícone de pessoa + chevron. */}
                <div className="relative flex-1">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
                  >
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <select
                    value={consultantId ?? ""}
                    onChange={(e) => setConsultantId(e.target.value || null)}
                    className="w-full appearance-none rounded-lg border border-line bg-panel-2 py-2.5 pl-9 pr-9 text-sm font-medium text-ink outline-none transition hover:border-accent/40 focus:border-accent/60"
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
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
                {/* Editar → abre a tela de Consultores (edição, mesmo em conta individual). */}
                <Link
                  href="/empresa?tab=consultores"
                  title="Editar consultor"
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-panel px-3 text-[13px] font-medium text-ink-soft transition hover:border-accent/50 hover:text-accent"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className="h-3.5 w-3.5"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  Editar
                </Link>
              </div>
            )}
            <span className="mt-1.5 block text-[11px] text-ink-mute">
              Aparece assinando a proposta.
            </span>
          </div>

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

          <div id="baixar-sec">
            <SectionTitle>Baixar proposta</SectionTitle>
          </div>
          {firstRun && !clientMissing && (
            <p className="mb-2.5 rounded-lg border border-accent/30 bg-accent/[0.07] px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
              🎉 Está pronta! Baixe agora — sua{" "}
              <strong className="text-ink">primeira proposta é grátis</strong>.
            </p>
          )}
          <DownloadActions
            layout="panel"
            blocked={clientMissing}
            onBlocked={focusClientField}
            onPdf={() => doDownload("PDF")}
            onHtml={() => doDownload("HTML")}
          />

          <div className="h-24" />
        </div>

        {/* Preview (editável) — documento contido e centralizado, com margem */}
        <div className="relative flex min-h-0 min-w-0 justify-center overflow-hidden bg-bg px-4">
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
          {/* CTA de desbloqueio no PREVIEW (free) — a marca d'água vai no
              download; aqui avisamos e oferecemos assinar. */}
          {!isPaid && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-4">
              <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-accent/50 bg-panel/95 px-4 py-2 text-[13px] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)] backdrop-blur">
                <span className="text-ink-soft">
                  🔒 O download sai com{" "}
                  <strong className="text-ink">marca d&apos;água</strong>
                </span>
                <UnlockLink
                  from="preview"
                  className="whitespace-nowrap rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-bg transition hover:opacity-90"
                >
                  Baixe sem a marca →
                </UnlockLink>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pós-download GRÁTIS: saiu com marca d'água → oferta de desbloqueio. */}
      {celebrate && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setCelebrate(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-accent/40 bg-panel p-7 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl" aria-hidden>
              🔒
            </div>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">
              Sua proposta está pronta
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Você baixou com marca d&apos;água pra conferir. Pra{" "}
              <strong className="text-ink">enviar a um cliente hoje</strong>,
              desbloqueie sem a marca — o KRONOS não fica por cima da proposta.
            </p>
            <div className="mt-4 rounded-xl border border-line bg-panel-2 p-4 text-left text-[13px] leading-relaxed text-ink-soft">
              Assine e baixe{" "}
              <strong className="text-ink">sem marca d&apos;água</strong>, quantas
              propostas quiser. 7 dias de garantia · cancele quando quiser.
            </div>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCelebrate(false)}
                className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-ink-mute transition hover:text-ink"
              >
                Continuar criando
              </button>
              <UnlockLink
                from="download"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90"
              >
                Baixar sem marca d&apos;água →
              </UnlockLink>
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
  disabled = false,
  blocked = false,
  onBlocked,
  layout,
  highlight = false,
}: {
  onPdf: () => void;
  onHtml: () => void;
  disabled?: boolean;
  // blocked = clicável, mas ainda falta algo (ex.: nome do cliente) → em vez de
  // abrir o menu, chama onBlocked (que guia pro campo). Nada de dead-click.
  blocked?: boolean;
  onBlocked?: () => void;
  layout: "header" | "panel";
  highlight?: boolean;
}) {
  const header = layout === "header";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cta = highlight && !disabled && !open;
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
      {/* Quando é a hora de baixar, o botão pulsa via box-shadow (kronos-btn-glow)
          — NÃO usa transform:scale, que vazava da viewport e criava scroll. */}
      <button
        type="button"
        onClick={() => {
          if (blocked) {
            onBlocked?.();
            return;
          }
          setOpen((o) => !o);
        }}
        disabled={disabled}
        aria-expanded={open}
        className={`relative flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-accent font-semibold text-bg shadow-sm transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${
          cta ? "kronos-btn-glow" : ""
        } ${header ? "px-5 py-2 text-sm" : "w-full px-4 py-2.5 text-sm"}`}
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

// Editor de lista título+descrição (passos/pilares): clica no item → abre os
// campos pra editar. Edita no menu da esquerda; salva em cima da variação.
function TitleDescEditor({
  items,
  onItem,
  onAdd,
  onRemove,
  addLabel,
}: {
  items: { title: string; description: string }[];
  onItem: (
    i: number,
    patch: Partial<{ title: string; description: string }>,
  ) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  addLabel: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-line bg-panel"
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
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
                <span className="shrink-0 text-[11px] text-ink-mute">
                  {String(i + 1).padStart(2, "0")} ·
                </span>
                <span className="min-w-0 truncate text-sm text-ink">
                  {it.title || "Sem título"}
                </span>
              </button>
              <MiniBtn danger onClick={() => onRemove(i)}>
                remover
              </MiniBtn>
            </div>
            {isOpen && (
              <div className="space-y-2 border-t border-line px-3 py-3">
                <label className="block">
                  <Label>Título</Label>
                  <TextInput
                    value={it.title}
                    onChange={(v) => onItem(i, { title: v })}
                  />
                </label>
                <label className="block">
                  <Label>Descrição</Label>
                  <TextArea
                    value={it.description}
                    onChange={(v) => onItem(i, { description: v })}
                    rows={2}
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}
      <MiniBtn onClick={onAdd}>{addLabel}</MiniBtn>
    </div>
  );
}

// Lista simples de strings editáveis (ex.: motivos da recomendação).
function StringListEditor({
  items,
  onItem,
  onAdd,
  onRemove,
  addLabel,
}: {
  items: string[];
  onItem: (i: number, value: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((t, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2"
        >
          <span className="shrink-0 text-[11px] text-ink-mute">{i + 1}</span>
          <input
            value={t}
            onChange={(e) => onItem(i, e.target.value)}
            placeholder="Motivo"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
          />
          <MiniBtn danger onClick={() => onRemove(i)}>
            remover
          </MiniBtn>
        </div>
      ))}
      <MiniBtn onClick={onAdd}>{addLabel}</MiniBtn>
    </div>
  );
}


// Sem NENHUMA solução (nem por IA, nem manual) não dá pra montar proposta.
// Aviso explícito + CTA pro catálogo (aba Soluções & Planos, onde vive a IA).
function NoCatalogNotice() {
  return (
    <div className="rounded-xl border border-dashed border-accent/40 bg-accent/[0.05] p-5 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-accent/12 text-accent">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="h-5 w-5"
        >
          <path d="M12 2 2 7l10 5 10-5-10-5z" />
          <path d="m2 17 10 5 10-5" />
          <path d="m2 12 10 5 10-5" />
        </svg>
      </div>
      <h3 className="mt-3 text-[15px] font-semibold text-ink">
        Seu catálogo ainda está vazio
      </h3>
      <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-soft">
        Pra montar uma proposta você precisa primeiro das{" "}
        <strong className="text-ink">soluções que você vende</strong>. A IA pode
        escrever tudo a partir de uma descrição ou arquivo — ou você preenche à
        mão.
      </p>
      <Link
        href="/empresa?tab=solucoes"
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className="h-4 w-4"
        >
          <path d="M12 2c0 5-5 10-10 10 5 0 10 5 10 10 0-5 5-10 10-10-5 0-10-5-10-10z" />
        </svg>
        Montar meu catálogo
      </Link>
    </div>
  );
}

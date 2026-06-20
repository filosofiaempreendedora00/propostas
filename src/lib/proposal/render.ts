import type {
  ProposalData,
  Solution,
  Tier,
  Pillar,
  Step,
  InvestmentGroup,
} from "./types";
import { DEFAULT_PROPOSAL } from "./defaults";

// ---------- helpers ----------
const esc = (s: string): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const n2 = (i: number) => String(i + 1).padStart(2, "0");

export function slugify(s: string): string {
  return (
    String(s ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "proposta"
  );
}

// ---------- blocos ----------
function pillarsHtml(pillars: Pillar[]): string {
  return pillars
    .map(
      (p, i) => `
      <div class="pillar">
        <div class="pnum">${n2(i)}</div>
        <h3 data-edit="pillar.${i}.title">${esc(p.title)}</h3>
        <p data-edit="pillar.${i}.description">${esc(p.description)}</p>
      </div>`,
    )
    .join("");
}

function solList(
  kicker: string,
  items: string[] | undefined,
  variant: string,
): string {
  return items && items.length
    ? `<div class="sol2-deliver ${variant}"><div class="sol2-k">${kicker}</div><ul>${items
        .map((d) => `<li>${esc(d)}</li>`)
        .join("")}</ul></div>`
    : "";
}

function solutionsHtml(solutions: Solution[]): string {
  return solutions
    .map(
      (s, i) => `
      <div class="sol2">
        <div class="sol2-head"><span class="sol2-num">${n2(i)}</span><h3>${esc(s.name)}</h3>${
          s.timeline && s.timeline.trim()
            ? `<span class="sol2-time">Prazo · ${esc(s.timeline)}</span>`
            : ""
        }</div>
        <div class="sol2-grid">
          <div class="sol2-cell"><div class="sol2-k">O problema que resolve</div><p>${esc(s.problemSolved)}</p></div>
          <div class="sol2-cell"><div class="sol2-k">Como funciona</div><p>${esc(s.howItWorks)}</p></div>
          <div class="sol2-cell"><div class="sol2-k">Benefício esperado</div><p>${esc(s.expectedBenefit)}</p></div>
        </div>
        ${solList("Entregáveis", s.deliverables, "deliver")}
        ${solList("Destaques", s.highlights, "high")}
        ${solList("Precisamos de você", s.requirements, "req")}
      </div>`,
    )
    .join("");
}

function tiersHtml(tiers: Tier[]): string {
  return tiers
    .map(
      (t) => `
      <div class="tier${t.featured ? " featured" : ""}">
        <div class="tier-head">
          <div class="tname">${esc(t.name)}</div>
          <span class="bill-tag">${t.billing === "recorrente" ? "Recorrente" : "Pagamento único"}</span>
        </div>
        <div class="price">${esc(t.price)}<small>${esc(t.priceSuffix)}</small></div>
        <div class="billing">${esc(t.description)}</div>
        <ul>${t.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      </div>`,
    )
    .join("");
}

function investmentGroupsHtml(groups: InvestmentGroup[]): string {
  return groups
    .filter((g) => g.plans.length > 0)
    .map(
      (g) => `
      <div class="invest-group">
        <div class="invest-group-name">${esc(g.solution)}</div>
        <div class="tiers">${tiersHtml(g.plans)}</div>
      </div>`,
    )
    .join("");
}

function stepsHtml(steps: Step[]): string {
  return steps
    .map(
      (s, i) => `
      <div class="step">
        <div class="snum">${n2(i)}</div>
        <div>
          <h3 data-edit="step.${i}.title">${esc(s.title)}</h3>
          <p data-edit="step.${i}.description">${esc(s.description)}</p>
        </div>
      </div>`,
    )
    .join("");
}

function reasonsHtml(reasons: string[]): string {
  return reasons
    .map((r, i) => `<li data-edit="reason.${i}">${esc(r)}</li>`)
    .join("");
}

// ---------- documento completo (standalone) ----------
// Blocos que admitem variações (preview por seção no Templates).
export type PreviewBlock =
  | "understanding"
  | "cost"
  | "strategy"
  | "solutions"
  | "investment"
  | "consultantRec"
  | "nextSteps";

const SHOW_FLAG: Record<PreviewBlock, keyof ProposalData> = {
  understanding: "showUnderstanding",
  cost: "showCost",
  strategy: "showStrategy",
  solutions: "showSolutions",
  investment: "showInvestment",
  consultantRec: "showConsultantRec",
  nextSteps: "showNextSteps",
};

export function renderProposalHTML(
  d: ProposalData,
  opts: { editable?: boolean; onlyBlock?: PreviewBlock } = {},
): string {
  // Edição inline (hover + contenteditable) só no preview do app.
  // No HTML baixado (editable:false) nada disso vai junto.
  const only = opts.onlyBlock;
  const editable = only ? false : opts.editable ?? true;

  // Preview de seção: liga só o bloco pedido, desliga o resto (capa/rodapé via CSS).
  if (only) {
    d = {
      ...d,
      showUnderstanding: false,
      showCost: false,
      showStrategy: false,
      showSolutions: false,
      showInvestment: false,
      showConsultantRec: false,
      showNextSteps: false,
    };
    (d as unknown as Record<string, boolean>)[SHOW_FLAG[only]] = true;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Proposta — ${esc(d.clientName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    ${
      d.theme === "light"
        ? `--bg:#FBF9F5; --bg-soft:#F1ECE3; --panel:#FFFFFF; --panel-2:#F7F2EA;
    --line:rgba(0,0,0,.10); --line-2:rgba(0,0,0,.16);
    --ink:#1C1A17; --ink-soft:#55514A; --ink-mute:#8B857B;`
        : `--bg:#0A0B0D; --bg-soft:#101216; --panel:#14171C; --panel-2:#181C22;
    --line:rgba(255,255,255,.08); --line-2:rgba(255,255,255,.14);
    --ink:#ECECE7; --ink-soft:#A7ABB2; --ink-mute:#6E737B;`
    }
    --accent:${esc(d.accent)};
    --accent-dim:color-mix(in srgb, ${esc(d.accent)} 14%, transparent);
    --radius:18px; --maxw:1080px;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{background:var(--bg);color:var(--ink);font-family:'Inter',system-ui,sans-serif;font-weight:400;line-height:1.6;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-wrap:break-word}
  .wrap{max-width:var(--maxw);margin:0 auto;padding-inline:64px}
  .display{font-family:'Fraunces',serif;font-weight:400;letter-spacing:-.01em;line-height:1.12}
  .eyebrow{font-size:12px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);display:inline-flex;align-items:center;gap:10px}
  .eyebrow::before{content:"";width:26px;height:1px;background:var(--accent);opacity:.7}
  .lead{font-size:19px;color:var(--ink-soft);font-weight:300;max-width:64ch}
  section{position:relative;border-top:1px solid var(--line)}
  .pad{padding:112px 0}
  .h2{font-size:clamp(22px,3.4vw,38px);margin:24px 0 0}
  .k{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:10px;font-weight:500}

  /* Capa */
  .cover{border-top:none;min-height:100vh;display:flex;flex-direction:column;justify-content:space-between;padding:7vh 0;background:radial-gradient(1200px 640px at 82% -12%, var(--accent-dim), transparent 60%),radial-gradient(900px 520px at -12% 112%, rgba(120,140,200,.06), transparent 55%)}
  .cover .wrap{width:100%}
  .cover-top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-bottom:14px;border-bottom:1px solid var(--line)}
  .brandmark{display:flex;align-items:center;gap:12px;font-weight:600;font-size:17px;letter-spacing:.02em}
  .brandmark .dot{width:32px;height:32px;border-radius:9px;background:linear-gradient(140deg,var(--accent),#8c7044);display:grid;place-items:center;color:#0A0B0D;font-family:'Fraunces',serif;font-weight:600;font-size:16px}
  .brandmark .brand-logo{height:40px;width:auto;max-width:240px;object-fit:contain;display:block}
  .cover-meta{font-size:11.5px;color:var(--ink-mute);letter-spacing:.2em;text-transform:uppercase;white-space:nowrap}
  .cover-mid{padding-block:0}
  .cover .eyebrow{font-size:12.5px;letter-spacing:.26em}
  .cover h1{font-size:clamp(36px,5.7vw,64px);line-height:1.06;letter-spacing:-.02em;max-width:13em;margin:30px 0 32px}
  .cover h1 em{font-style:italic;color:var(--accent)}
  .cover .lead{font-size:18px;max-width:54ch}
  .cover-foot{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:26px 36px;border-top:1px solid var(--line-2);padding-top:34px}
  .fact .fk{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-mute);margin-bottom:10px}
  .fact .fv{font-size:15.5px;color:var(--ink);font-weight:500}

  /* grids genéricos de blocos */
  .gblocks{display:grid;gap:18px;margin-top:52px}
  .g2{grid-template-columns:repeat(2,1fr)}
  .g3{grid-template-columns:repeat(3,1fr)}
  .block{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:26px}
  .block p{font-size:15px;color:var(--ink-soft);font-weight:300}

  /* Custo (urgência) — leve toque de alerta */
  .cost{background:var(--bg-soft)}
  .cost .block{border-color:rgba(232,118,92,.18)}
  .cost .k{color:#E8765C}
  .cost .eyebrow{color:#E8765C}.cost .eyebrow::before{background:#E8765C}

  /* Estratégia / pilares */
  .pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px}
  .pillar{border-top:1px solid var(--line-2);padding-top:22px}
  .pillar .pnum{font-family:'Fraunces',serif;font-size:30px;color:var(--accent);line-height:1;margin-bottom:14px}
  .pillar h3{font-size:20px;font-weight:600;margin-bottom:10px}
  .pillar p{font-size:15px;color:var(--ink-soft);font-weight:300}

  /* Soluções (ricas) */
  .sol2{padding:40px 0;border-top:1px solid var(--line)}
  .sol2:first-of-type{border-top:none}
  .sol2-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:12px 18px;margin-bottom:22px}
  .sol2-num{font-family:'Fraunces',serif;font-size:34px;color:var(--accent);line-height:1}
  .sol2-head h3{font-size:26px;font-weight:600;letter-spacing:-.01em}
  .sol2-time{margin-left:auto;align-self:center;font-size:11.5px;letter-spacing:.04em;color:var(--ink-mute);border:1px solid var(--line-2);border-radius:999px;padding:5px 12px;white-space:nowrap}
  .sol2-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
  .sol2-k{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:8px;font-weight:500}
  .sol2-cell p{font-size:14.5px;color:var(--ink-soft);font-weight:300}
  .sol2-deliver{margin-top:22px;border-top:1px solid var(--line);padding-top:18px}
  .sol2-deliver ul{list-style:none;display:flex;flex-wrap:wrap;gap:10px 24px}
  .sol2-deliver li{position:relative;padding-left:20px;font-size:14px;color:var(--ink-soft)}
  .sol2-deliver li::before{content:"✓";position:absolute;left:0;color:var(--accent)}
  .sol2-deliver.high li::before{content:"★";font-size:12px}
  .sol2-deliver.req li::before{content:"→";color:var(--ink-mute)}

  /* Investimento */
  .invest{background:var(--bg-soft)}
  .tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:52px}
  .tier{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:34px 30px;display:flex;flex-direction:column}
  .tier.featured{border-color:var(--accent);background:linear-gradient(180deg,var(--accent-dim),transparent 42%),var(--panel-2);position:relative;overflow:hidden;padding-top:56px}
  .tier.featured::before{content:"Recomendado";position:absolute;top:0;left:0;right:0;height:34px;display:flex;align-items:center;justify-content:center;background:var(--accent);color:#0A0B0D;font-size:10.5px;font-weight:600;letter-spacing:.18em;text-transform:uppercase}
  .tier .tname{font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-mute);margin-bottom:18px}
  .tier .price{font-family:'Fraunces',serif;font-size:38px;line-height:1;margin-bottom:6px}
  .tier .price small{font-size:15px;color:var(--ink-mute);font-family:'Inter';font-weight:400}
  .tier .billing{font-size:13px;color:var(--ink-mute);margin-bottom:24px}
  .tier ul{list-style:none;display:flex;flex-direction:column;gap:12px;margin-top:6px;padding-top:22px;border-top:1px solid var(--line)}
  .tier li{position:relative;padding-left:22px;font-size:14px;color:var(--ink-soft)}
  .tier li::before{content:"✓";position:absolute;left:0;color:var(--accent);font-size:13px}
  .invest-group{margin-top:46px}
  .invest-group:first-of-type{margin-top:40px}
  .invest-group-name{font-family:'Fraunces',serif;font-size:22px;color:var(--ink);margin-bottom:18px;display:flex;align-items:center;gap:12px}
  .invest-group-name::before{content:"";width:20px;height:1px;background:var(--accent)}
  .invest-group .tiers{margin-top:0}
  .tier-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px}
  .tier-head .tname{margin-bottom:0}
  .bill-tag{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-mute);border:1px solid var(--line-2);border-radius:999px;padding:3px 8px;white-space:nowrap}
  .rec-reason{margin-top:32px;display:flex;gap:14px;align-items:flex-start;background:var(--panel);border:1px solid var(--line-2);border-radius:14px;padding:20px 24px;max-width:760px}
  .rec-reason .badge{font-size:20px}
  .rec-reason p{font-size:15px;color:var(--ink-soft);font-weight:300}
  .rec-reason .rk{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:6px;font-weight:500}

  /* Recomendação do consultor */
  .rec-card{margin-top:40px;background:linear-gradient(180deg,var(--accent-dim),transparent 60%),var(--panel);border:1px solid var(--line-2);border-radius:var(--radius);padding:44px}
  .rec-card h2{font-size:clamp(26px,3.4vw,38px);margin-bottom:16px}
  .rec-reasons{list-style:none;margin-top:24px;display:flex;flex-direction:column;gap:14px}
  .rec-reasons li{position:relative;padding-left:28px;font-size:16px;color:var(--ink-soft)}
  .rec-reasons li::before{content:"";position:absolute;left:0;top:9px;width:9px;height:9px;border-radius:50%;background:var(--accent)}

  /* Próximos passos */
  .nextsteps{background:radial-gradient(900px 500px at 50% 120%, var(--accent-dim), transparent 60%),var(--bg)}
  .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px}
  .step{display:flex;gap:16px}
  .step .snum{font-family:'Fraunces',serif;font-size:26px;color:var(--accent);line-height:1.1}
  .step h3{font-size:17px;font-weight:600;margin-bottom:6px}
  .step p{font-size:14px;color:var(--ink-soft);font-weight:300}
  .closing-cta{margin-top:56px;display:flex;flex-wrap:wrap;align-items:center;gap:24px}
  .cta{display:inline-flex;align-items:center;gap:12px;background:var(--accent);color:#0A0B0D;font-weight:600;font-size:15px;padding:16px 30px;border-radius:999px;text-decoration:none;transition:transform .2s ease}
  .cta:hover{transform:translateY(-2px)}
  .validity{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);border:1px solid var(--line-2);border-radius:999px;padding:8px 16px}
  .contact{display:flex;gap:48px;flex-wrap:wrap;margin-top:56px;padding-top:36px;border-top:1px solid var(--line)}
  .contact .ck{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-mute);margin-bottom:6px}
  .contact .cv{font-size:15px;font-weight:500}

  footer{border-top:1px solid var(--line);padding:34px 0;text-align:center;color:var(--ink-mute);font-size:12.5px;letter-spacing:.04em}

  ${
    editable
      ? `/* edição inline (só no preview) */
  [data-edit]{outline:1px dashed transparent;outline-offset:4px;border-radius:3px;transition:outline-color .12s ease}
  [data-edit]:hover{outline-color:color-mix(in srgb, var(--accent) 55%, transparent);cursor:text}
  [data-edit]:focus{outline:1px dashed var(--accent);outline-offset:4px}
  [data-edit]:empty::before{content:attr(data-placeholder);color:var(--ink-mute);opacity:.65}`
      : ""
  }

  @media(max-width:860px){
    .wrap{padding-inline:44px}
    .g2,.g3,.pillars,.tiers,.steps,.sol2-grid{grid-template-columns:1fr}
    .pad{padding:72px 0}.rec-card{padding:28px}
    .cover-foot,.cover-top,.contact{gap:24px}
  }
  @media(max-width:520px){
    .wrap{padding-inline:28px}
    .cover-top{flex-direction:column;align-items:flex-start;gap:14px}
    .cover-foot{grid-template-columns:1fr 1fr;gap:22px 24px}
    .cover-meta{text-align:left}
  }

  /* Impressão / Salvar como PDF — força as cores do tema (senão o Chrome
     descarta os fundos e tudo vira branco) e cuida da paginação: preenche as
     páginas, mantém títulos com o conteúdo e não corta cards no meio. */
  @media print{
    @page{margin:0}
    html,body{background:var(--bg)!important}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}

    /* Capa = página de rosto cheia, conteúdo distribuído (sem vazio embaixo). */
    .cover{min-height:100vh;justify-content:space-between;padding:9vh 0;break-after:page}
    .cover-mid{padding-block:0}

    /* Seções mais compactas e em fluxo contínuo — preenche as páginas. */
    .pad{padding:52px 0}
    .gblocks{margin-top:30px}
    .pillars,.tiers,.steps{margin-top:30px}
    section:not(.cover){break-inside:auto}

    /* Cabeçalho de seção fica junto: eyebrow → título → intro nunca órfãos. */
    .eyebrow{break-after:avoid}
    .h2,.display{break-after:avoid;break-before:avoid}
    .lead{break-before:avoid}
    .k,.sol2-k,.invest-group-name,.sol2-head,.sol2-num,.pnum,.snum,.tname,.tier-head{break-after:avoid}
    p{orphans:3;widows:3}

    /* ===== Paginação à prova de corte =====
       Toda unidade visual atômica é "indivisível": a quebra de página só pode
       cair NOS VÃOS entre blocos, nunca atravessando um. Numa solução alta, ela
       parte entre o cabeçalho, as células e os entregáveis — sem cortar texto. */
    .block,.tier,.pillar,.step,.rec-card,.rec-reason,.sol2-cell,
    .sol2-head,.sol2-deliver,.fact,.contact,.closing-cta,
    .rec-reasons li,.tier li,.sol2-deliver li,.contact > div,
    figure,img{break-inside:avoid}
  }
</style>
${only ? `<style>.cover,footer{display:none!important}section{border-top:none!important}.pad{padding:40px 0}</style>` : ""}
</head>
<body>

<!-- 1. CAPA -->
<section class="cover">
  <div class="wrap cover-top">
    <div class="brandmark">${
      d.logo
        ? `<img class="brand-logo" src="${esc(d.logo)}" alt="${esc(d.companyName)}">`
        : `<span class="dot">${esc(d.companyInitial)}</span><span data-edit="companyName">${esc(d.companyName)}</span>`
    }</div>
    <div class="cover-meta">PROPOSTA COMERCIAL${d.showProposalNumber ? ` · Nº ${esc(d.proposalNumber)}` : ""}</div>
  </div>
  <div class="wrap cover-mid">
    <span class="eyebrow" data-edit="coverEyebrow" data-placeholder="[ rótulo da capa ]">${esc(d.coverEyebrow)}</span>
    <h1 class="display"><span data-edit="coverHeadline" data-placeholder="[ frase da capa ]">${esc(d.coverHeadline)}</span> <em data-edit="clientName" data-placeholder="[ nome da empresa ]">${esc(d.clientName)}</em>.</h1>
    <p class="lead" data-edit="headlineLead">${esc(d.headlineLead)}</p>
  </div>
  <div class="wrap cover-foot">
    <div class="fact"><div class="fk">Cliente</div><div class="fv" data-edit="clientLegalName" data-placeholder="[ nome do cliente ]">${esc(d.clientLegalName)}</div></div>
    <div class="fact"><div class="fk">Preparado por</div><div class="fv" data-edit="companyName">${esc(d.companyName)}</div></div>
    <div class="fact"><div class="fk">Data</div><div class="fv" data-edit="dateLabel">${esc(d.dateLabel)}</div></div>
    <div class="fact"><div class="fk">Válida até</div><div class="fv">${esc(d.validUntilLabel)}</div></div>
  </div>
</section>

<!-- 2. O QUE ENTENDEMOS -->
${
  d.showUnderstanding
    ? `<section class="pad understand">
  <div class="wrap">
    <span class="eyebrow">O que entendemos</span>
    <h2 class="display h2" data-edit="understandingHeading">${esc(d.understandingHeading)}</h2>
    <div class="gblocks g2">
      <div class="block"><div class="k">Situação atual</div><p data-edit="currentSituation">${esc(d.currentSituation)}</p></div>
      <div class="block"><div class="k">Gargalo principal</div><p data-edit="mainBottleneck">${esc(d.mainBottleneck)}</p></div>
      <div class="block"><div class="k">Oportunidade</div><p data-edit="opportunity">${esc(d.opportunity)}</p></div>
      <div class="block"><div class="k">Objetivo</div><p data-edit="objective">${esc(d.objective)}</p></div>
    </div>
  </div>
</section>`
    : ""
}

<!-- 3. O CUSTO DE CONTINUAR IGUAL -->
${
  d.showCost
    ? `<section class="pad cost">
  <div class="wrap">
    <span class="eyebrow">O custo de continuar igual</span>
    <h2 class="display h2" data-edit="costQuestion">${esc(d.costQuestion)}</h2>
    <div class="gblocks g3">
      <div class="block"><div class="k">Operacional</div><p data-edit="costOperational">${esc(d.costOperational)}</p></div>
      <div class="block"><div class="k">Financeiro</div><p data-edit="costFinancial">${esc(d.costFinancial)}</p></div>
      <div class="block"><div class="k">Estratégico</div><p data-edit="costStrategic">${esc(d.costStrategic)}</p></div>
    </div>
  </div>
</section>`
    : ""
}

<!-- 4. ESTRATÉGIA RECOMENDADA -->
${
  d.showStrategy
    ? `<section class="pad strategy">
  <div class="wrap">
    <span class="eyebrow">Estratégia recomendada</span>
    <h2 class="display h2" data-edit="strategyHeading">${esc(d.strategyHeading)}</h2>
    <p class="lead" style="margin-top:18px" data-edit="strategyIntro">${esc(d.strategyIntro)}</p>
    <div class="pillars">${pillarsHtml(d.pillars)}</div>
  </div>
</section>`
    : ""
}

<!-- 5. SOLUÇÕES RECOMENDADAS -->
${
  d.showSolutions
    ? `<section class="pad solutions">
  <div class="wrap">
    <span class="eyebrow">Soluções recomendadas</span>
    <h2 class="display h2" data-edit="solutionsHeading">${esc(d.solutionsHeading)}</h2>
    <p class="lead" style="margin-top:14px" data-edit="solutionsNote">${esc(d.solutionsNote)}</p>
    <div style="margin-top:44px">${solutionsHtml(d.solutions)}</div>
  </div>
</section>`
    : ""
}

<!-- 6. INVESTIMENTO -->
${
  d.showInvestment
    ? `<section class="invest pad">
  <div class="wrap">
    <span class="eyebrow">Investimento</span>
    <h2 class="display h2" data-edit="investHeading">${esc(d.investHeading)}</h2>
    ${investmentGroupsHtml(d.investmentGroups)}
    ${
      d.recommendationReason
        ? `<div class="rec-reason"><span class="badge">★</span><div><div class="rk">Por que o plano em destaque</div><p data-edit="recommendationReason">${esc(d.recommendationReason)}</p></div></div>`
        : ""
    }
  </div>
</section>`
    : ""
}

<!-- 7. RECOMENDAÇÃO DO CONSULTOR -->
${
  d.showConsultantRec
    ? `<section class="pad consultant-rec">
  <div class="wrap">
    <span class="eyebrow">Recomendação do ${esc((d.consultantTerm ?? "Consultor").toLowerCase())}</span>
    <div class="rec-card">
      <h2 class="display" data-edit="consultantRecHeading">${esc(d.consultantRecHeading)}</h2>
      <p class="lead" data-edit="consultantRecText">${esc(d.consultantRecText)}</p>
      <ul class="rec-reasons">${reasonsHtml(d.consultantRecReasons)}</ul>
    </div>
  </div>
</section>`
    : ""
}

<!-- 8. PRÓXIMOS PASSOS -->
${
  d.showNextSteps
    ? `<section class="pad nextsteps">
  <div class="wrap">
    <span class="eyebrow">Próximos passos</span>
    <h2 class="display h2" data-edit="nextStepsHeading">${esc(d.nextStepsHeading)}</h2>
    <div class="steps">${stepsHtml(d.steps)}</div>
    <div class="closing-cta">
      <a href="#" class="cta"><span data-edit="ctaLabel">${esc(d.ctaLabel)}</span> &nbsp;→</a>
      <span class="validity">Proposta válida até ${esc(d.validUntilLabel)}</span>
    </div>
    <div class="contact">
      <div><div class="ck">${esc(d.consultantTerm ?? "Consultor")}</div><div class="cv">${esc(d.responsible)}</div></div>
      <div><div class="ck">Telefone</div><div class="cv">${esc(d.phone)}</div></div>
      <div><div class="ck">E-mail</div><div class="cv">${esc(d.email)}</div></div>
    </div>
  </div>
</section>`
    : ""
}

<footer>© ${esc(d.dateLabel.replace(/.*\b(\d{4})\b.*/, "$1") || "")} ${esc(d.companyName)} · Proposta confidencial preparada para ${esc(d.clientLegalName)}.</footer>

${
  editable
    ? `<script>
(function(){
  function commit(el){
    var f=el.getAttribute('data-edit');
    var val=el.innerText.trim();
    el.removeAttribute('contenteditable');
    try{ parent.postMessage({source:'proposal-edit',field:f,value:val},'*'); }catch(e){}
    document.querySelectorAll('[data-edit="'+f+'"]').forEach(function(o){ if(o!==el){ o.textContent=val; } });
  }
  document.addEventListener('click',function(e){
    var el=e.target.closest?e.target.closest('[data-edit]'):null;
    if(!el||el.isContentEditable) return;
    el.setAttribute('contenteditable','true'); el.focus();
    try{ var r=document.createRange(); r.selectNodeContents(el); var s=getSelection(); s.removeAllRanges(); s.addRange(r); }catch(e){}
  });
  document.addEventListener('blur',function(e){ var el=e.target; if(el&&el.isContentEditable) commit(el); },true);
  document.addEventListener('keydown',function(e){
    var el=e.target; if(!el||!el.isContentEditable) return;
    if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); el.blur(); }
    else if(e.key==='Escape'){ e.preventDefault(); el.blur(); }
  });
})();
</script>`
    : ""
}

</body>
</html>`;

  if (editable) return html;
  // Export/preview: remove qualquer vestígio de edição (atributos inertes).
  return html
    .replace(/ data-edit="[^"]*"/g, "")
    .replace(/ data-placeholder="[^"]*"/g, "");
}

// Preview de UMA seção (Templates): aplica o payload da variação sobre os
// defaults e renderiza só aquele bloco (sem capa, sem edição).
export function renderBlockPreviewHTML(
  block: PreviewBlock,
  payload: Partial<ProposalData>,
): string {
  return renderProposalHTML(
    { ...DEFAULT_PROPOSAL, ...payload },
    { onlyBlock: block },
  );
}

import type { ProposalData, Solution, Tier, Pain } from "./types";

// ---------- helpers ----------
const esc = (s: string): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Texto simples + suporte a **negrito** (vira <strong>) e quebras de linha.
const rich = (s: string): string =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");

export function slugify(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50) || "proposta";
}

// ---------- blocos ----------
function painsHtml(pains: Pain[]): string {
  return pains
    .map(
      (p, i) => `
        <div class="pain">
          <div class="n">${String(i + 1).padStart(2, "0")}</div>
          <h3 data-edit="pain.${i}.title">${esc(p.title)}</h3>
          <p data-edit="pain.${i}.description">${esc(p.description)}</p>
        </div>`,
    )
    .join("");
}

function solutionsHtml(solutions: Solution[]): string {
  return solutions
    .map(
      (s, i) => `
      <div class="solution">
        <div class="sol-num">${String(i + 1).padStart(2, "0")}</div>
        <div class="sol-body">
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.description)}</p>
        </div>
        <ul class="sol-features">
          ${s.features.map((f) => `<li>${esc(f)}</li>`).join("")}
        </ul>
      </div>`,
    )
    .join("");
}

function tiersHtml(tiers: Tier[]): string {
  return tiers
    .map(
      (t) => `
      <div class="tier${t.featured ? " featured" : ""}">
        <div class="tname">${esc(t.name)}</div>
        <div class="price">${esc(t.price)}<small>${esc(t.priceSuffix)}</small></div>
        <div class="billing">${esc(t.description)}</div>
        <ul>
          ${t.features.map((f) => `<li>${esc(f)}</li>`).join("")}
        </ul>
      </div>`,
    )
    .join("");
}

// ---------- documento completo (standalone) ----------
export function renderProposalHTML(d: ProposalData): string {
  return `<!DOCTYPE html>
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
    --bg:#0A0B0D; --bg-soft:#101216; --panel:#14171C; --panel-2:#181C22;
    --line:rgba(255,255,255,.08); --line-2:rgba(255,255,255,.14);
    --ink:#ECECE7; --ink-soft:#A7ABB2; --ink-mute:#6E737B;
    --accent:${esc(d.accent)};
    --accent-dim:color-mix(in srgb, ${esc(d.accent)} 14%, transparent);
    --radius:18px; --maxw:1080px;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{background:var(--bg);color:var(--ink);font-family:'Inter',system-ui,sans-serif;font-weight:400;line-height:1.6;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 40px}
  .display{font-family:'Fraunces',serif;font-weight:400;letter-spacing:-.01em;line-height:1.04}
  .eyebrow{font-size:12px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);display:inline-flex;align-items:center;gap:10px}
  .eyebrow::before{content:"";width:26px;height:1px;background:var(--accent);opacity:.7}
  .lead{font-size:19px;color:var(--ink-soft);font-weight:300;max-width:62ch}
  section{position:relative;border-top:1px solid var(--line)}
  .pad{padding:120px 0}
  .cover{border-top:none;min-height:100vh;display:flex;flex-direction:column;justify-content:space-between;padding:48px 0 56px;background:radial-gradient(1200px 600px at 78% -10%, var(--accent-dim), transparent 60%),radial-gradient(900px 500px at -10% 110%, rgba(120,140,200,.07), transparent 55%)}
  .cover .wrap{width:100%}
  .cover-top{display:flex;justify-content:space-between;align-items:center}
  .brandmark{display:flex;align-items:center;gap:12px;font-weight:600;letter-spacing:.02em}
  .brandmark .dot{width:30px;height:30px;border-radius:9px;background:linear-gradient(140deg,var(--accent),#8c7044);display:grid;place-items:center;color:#0A0B0D;font-family:'Fraunces',serif;font-weight:600;font-size:16px}
  .cover-meta{font-size:13px;color:var(--ink-mute);letter-spacing:.04em}
  .cover-mid{padding:40px 0}
  .cover h1{font-size:clamp(46px,7vw,88px);margin:26px 0 30px}
  .cover h1 em{font-style:italic;color:var(--accent)}
  .cover-foot{display:flex;flex-wrap:wrap;gap:48px;border-top:1px solid var(--line);padding-top:32px}
  .fact .k{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-mute);margin-bottom:7px}
  .fact .v{font-size:16px;color:var(--ink);font-weight:500}
  .challenge h2{font-size:clamp(30px,4vw,46px);margin:28px 0 24px;max-width:18ch}
  .challenge .statement{font-size:22px;color:var(--ink-soft);font-weight:300;max-width:70ch;line-height:1.5}
  .challenge .statement strong{color:var(--ink);font-weight:500}
  .pains{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:56px}
  .pain{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:28px}
  .pain .n{font-family:'Fraunces',serif;font-size:15px;color:var(--accent);margin-bottom:14px}
  .pain h3{font-size:17px;font-weight:600;margin-bottom:9px}
  .pain p{font-size:14.5px;color:var(--ink-soft);font-weight:300}
  .sol-head{display:flex;justify-content:space-between;align-items:flex-end;gap:30px;flex-wrap:wrap;margin-bottom:64px}
  .sol-head h2{font-size:clamp(30px,4vw,46px);margin-top:24px}
  .solution{display:grid;grid-template-columns:88px 1fr 300px;gap:36px;align-items:start;padding:48px 0;border-top:1px solid var(--line)}
  .solution:first-of-type{border-top:none}
  .sol-num{font-family:'Fraunces',serif;font-size:46px;color:var(--accent);line-height:1;opacity:.85}
  .sol-body h3{font-size:25px;font-weight:600;margin-bottom:14px;letter-spacing:-.01em}
  .sol-body p{font-size:16px;color:var(--ink-soft);font-weight:300;max-width:56ch}
  .sol-features{list-style:none;display:flex;flex-direction:column;gap:13px}
  .sol-features li{position:relative;padding-left:24px;font-size:14.5px;color:var(--ink-soft)}
  .sol-features li::before{content:"";position:absolute;left:0;top:9px;width:7px;height:7px;border-radius:50%;border:1px solid var(--accent);background:var(--accent-dim)}
  .invest{background:var(--bg-soft)}
  .invest h2{font-size:clamp(30px,4vw,46px);margin-top:24px}
  .tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:60px}
  .tier{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:34px 30px;display:flex;flex-direction:column}
  .tier.featured{border-color:var(--line-2);background:linear-gradient(180deg,var(--accent-dim),transparent 42%),var(--panel-2);position:relative}
  .tier.featured::after{content:"Recomendado";position:absolute;top:20px;right:20px;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);border:1px solid var(--accent);border-radius:999px;padding:5px 11px}
  .tier .tname{font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-mute);margin-bottom:18px}
  .tier .price{font-family:'Fraunces',serif;font-size:38px;line-height:1;margin-bottom:6px}
  .tier .price small{font-size:15px;color:var(--ink-mute);font-family:'Inter';font-weight:400}
  .tier .billing{font-size:13px;color:var(--ink-mute);margin-bottom:24px}
  .tier ul{list-style:none;display:flex;flex-direction:column;gap:12px;margin-top:6px;padding-top:22px;border-top:1px solid var(--line)}
  .tier li{position:relative;padding-left:22px;font-size:14px;color:var(--ink-soft)}
  .tier li::before{content:"✓";position:absolute;left:0;color:var(--accent);font-size:13px}
  .closing{background:radial-gradient(900px 500px at 50% 120%, var(--accent-dim), transparent 60%),var(--bg);text-align:center}
  .closing h2{font-size:clamp(34px,5vw,60px);margin:26px auto 24px;max-width:16ch}
  .closing .lead{margin:0 auto 44px}
  .cta{display:inline-flex;align-items:center;gap:12px;background:var(--accent);color:#0A0B0D;font-weight:600;font-size:15px;padding:16px 30px;border-radius:999px;text-decoration:none;transition:transform .2s ease}
  .cta:hover{transform:translateY(-2px)}
  .contact{display:flex;justify-content:center;gap:48px;flex-wrap:wrap;margin-top:64px;padding-top:40px;border-top:1px solid var(--line)}
  .contact .k{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-mute);margin-bottom:6px}
  .contact .v{font-size:15px;font-weight:500}
  .validity{display:inline-block;margin-bottom:8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);border:1px solid var(--line-2);border-radius:999px;padding:8px 16px}
  footer{border-top:1px solid var(--line);padding:34px 0;text-align:center;color:var(--ink-mute);font-size:12.5px;letter-spacing:.04em}
  @media(max-width:860px){.wrap{padding:0 24px}.pains,.tiers{grid-template-columns:1fr}.solution{grid-template-columns:1fr;gap:18px;padding:40px 0}.sol-num{font-size:38px}.pad{padding:80px 0}}
</style>
</head>
<body>

<section class="cover">
  <div class="wrap cover-top">
    <div class="brandmark"><span class="dot">${esc(d.companyInitial)}</span><span data-edit="companyName">${esc(d.companyName)}</span></div>
    <div class="cover-meta">PROPOSTA COMERCIAL · Nº <span data-edit="proposalNumber">${esc(d.proposalNumber)}</span></div>
  </div>
  <div class="wrap cover-mid">
    <span class="eyebrow">Preparado exclusivamente para</span>
    <h1 class="display">Uma proposta para<br>impulsionar a <em data-edit="clientName">${esc(d.clientName)}</em>.</h1>
    <p class="lead" data-edit="headlineLead">${esc(d.headlineLead)}</p>
  </div>
  <div class="wrap cover-foot">
    <div class="fact"><div class="k">Cliente</div><div class="v" data-edit="clientLegalName">${esc(d.clientLegalName)}</div></div>
    <div class="fact"><div class="k">Preparado por</div><div class="v" data-edit="companyName">${esc(d.companyName)}</div></div>
    <div class="fact"><div class="k">Data</div><div class="v" data-edit="dateLabel">${esc(d.dateLabel)}</div></div>
    <div class="fact"><div class="k">Válida até</div><div class="v" data-edit="validUntilLabel">${esc(d.validUntilLabel)}</div></div>
  </div>
</section>

<section class="challenge pad">
  <div class="wrap">
    <span class="eyebrow">O Desafio</span>
    <h2 class="display" data-edit="challengeHeading">${esc(d.challengeHeading)}</h2>
    <p class="statement" data-edit="challengeStatement">${rich(d.challengeStatement)}</p>
    <div class="pains">${painsHtml(d.pains)}</div>
  </div>
</section>

<section class="solutions pad">
  <div class="wrap">
    <div class="sol-head">
      <div>
        <span class="eyebrow">Nossa abordagem</span>
        <h2 class="display" data-edit="solutionsHeading">${esc(d.solutionsHeading)}</h2>
      </div>
      <p class="lead" style="max-width:34ch;margin:0" data-edit="solutionsNote">${esc(d.solutionsNote)}</p>
    </div>
    ${solutionsHtml(d.solutions)}
  </div>
</section>

<section class="invest pad">
  <div class="wrap">
    <span class="eyebrow">Investimento</span>
    <h2 class="display" data-edit="investHeading">${esc(d.investHeading)}</h2>
    <div class="tiers">${tiersHtml(d.tiers)}</div>
  </div>
</section>

<section class="closing pad">
  <div class="wrap">
    <span class="validity">Proposta válida até <span data-edit="validUntilLabel">${esc(d.validUntilLabel)}</span></span>
    <h2 class="display" data-edit="closingHeading">${esc(d.closingHeading)}</h2>
    <p class="lead" data-edit="closingLead">${esc(d.closingLead)}</p>
    <a href="#" class="cta"><span data-edit="ctaLabel">${esc(d.ctaLabel)}</span> &nbsp;→</a>
    <div class="contact">
      <div><div class="k">Responsável</div><div class="v">${esc(d.responsible)}</div></div>
      <div><div class="k">Telefone</div><div class="v">${esc(d.phone)}</div></div>
      <div><div class="k">E-mail</div><div class="v">${esc(d.email)}</div></div>
    </div>
  </div>
</section>

<footer>© ${esc(d.dateLabel.replace(/.*\b(\d{4})\b.*/, "$1") || "")} ${esc(d.companyName)} · Proposta confidencial preparada para ${esc(d.clientLegalName)}.</footer>

<style>
  [data-edit]{outline:1px dashed transparent;outline-offset:4px;border-radius:3px;transition:outline-color .12s ease}
  [data-edit]:hover{outline-color:color-mix(in srgb, var(--accent) 55%, transparent);cursor:text}
  [data-edit]:focus{outline:1px dashed var(--accent);outline-offset:4px}
</style>
<script>
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
</script>

</body>
</html>`;
}

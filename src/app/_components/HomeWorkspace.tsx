"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// /início redesenhado: um passo-a-passo de 3 etapas, visual e clicável. Cada
// card leva pro lugar certo da ferramenta (1 → Sua Empresa; 2 e 3 → Gerador).
// Conta nova (isNew): o Passo 1 pulsa tracejado + anel radiante ("comece aqui")
// e o CTA "Criar uma proposta" TRAVA (sacode) destacando o Passo 1 — pra começar
// pelo catálogo. Conta configurada: o CTA vai direto pro Gerador. As "demos" de
// cada passo são miniaturas animadas em CSS (sem GIF), coerentes com o tema creme.

// CSS das demos (keyframes + classes prefixadas kx- pra não colidir com nada).
const KX_STYLE = `
.kx-demo{position:relative;height:184px;border:1px solid rgba(40,30,20,.12);border-radius:12px;background:#f7f1e7;overflow:hidden}
.kx-scr{position:absolute;inset:0;padding:12px}
.kx-lbl{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8a8175}
.kx-row{display:flex;align-items:center;gap:7px}
.kx-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(40,30,20,.18);border-radius:8px;background:#fff;padding:5px 9px;font-size:11px;font-weight:600;color:#2a2018}
.kx-chip.sm{font-size:10px;padding:4px 7px}
.kx-dropzone{position:absolute;border:1.5px dashed #c8a86a;border-radius:10px;background:rgba(169,126,51,.06);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:9.5px;font-weight:700;color:#6e5226;text-align:center;line-height:1.15}
.kx-dropzone svg{width:15px;height:15px}
.kx-fieldbar{height:9px;border-radius:5px;background:#eadfca;overflow:hidden;position:relative}
.kx-fieldbar>i{position:absolute;left:0;top:0;bottom:0;background:#c8a86a;border-radius:5px}
.kx-tick{color:#3f7d4e;font-weight:800}
.kx-cursor{position:absolute;width:15px;height:15px;pointer-events:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.25));z-index:6}
.kx-cursor svg{width:15px;height:15px}
.kx-ck{width:16px;height:16px;border:2px solid rgba(40,30,20,.18);border-radius:5px;background:#fff;display:inline-flex;align-items:center;justify-content:center}
.kx-ck svg{width:11px;height:11px}
.kx-loop{animation-iteration-count:infinite}
@keyframes kxd1file{0%{transform:translate(120px,-6px);opacity:0}12%{opacity:1}22%,42%{transform:translate(0,0);opacity:1}50%{opacity:0}100%{opacity:0}}
@keyframes kxd1spark{0%,44%{opacity:0}50%{opacity:1}70%{opacity:.6}100%{opacity:0}}
@keyframes kxd1fill{0%,52%{width:0}72%,100%{width:100%}}
@keyframes kxd1tick{0%,64%{opacity:0;transform:scale(.6)}72%,100%{opacity:1;transform:scale(1)}}
@keyframes kxd1tick2{0%,72%{opacity:0;transform:scale(.6)}80%,100%{opacity:1;transform:scale(1)}}
@keyframes kxd1tick3{0%,80%{opacity:0;transform:scale(.6)}88%,100%{opacity:1;transform:scale(1)}}
@keyframes kxd2click{0%,22%{transform:scale(1)}27%{transform:scale(.92)}33%,100%{transform:scale(1)}}
@keyframes kxd2ghost{0%,25%{opacity:0;transform:translate(0,0) scale(.9)}31%{opacity:1;transform:translate(0,0) scale(1)}60%{opacity:1;transform:translate(122px,-38px) scale(1)}69%,100%{opacity:0;transform:translate(122px,-38px) scale(.82)}}
@keyframes kxd2curs{0%{transform:translate(26px,42px)}22%,31%{transform:translate(44px,124px)}60%{transform:translate(150px,84px)}100%{transform:translate(150px,84px)}}
@keyframes kxd2zone{0%,58%{box-shadow:0 0 0 0 rgba(169,126,51,0)}64%{box-shadow:0 0 0 4px rgba(169,126,51,.3)}100%{box-shadow:0 0 0 0 rgba(169,126,51,0)}}
@keyframes kxd2promptout{0%,60%{opacity:1}68%,100%{opacity:0}}
@keyframes kxd2donein{0%,66%{opacity:0}74%,100%{opacity:1}}
@keyframes kxd3curs{0%{transform:translate(24px,20px)}18%,26%{transform:translate(30px,52px)}46%,54%{transform:translate(30px,86px)}100%{transform:translate(150px,120px)}}
@keyframes kxd3box1{0%,22%{background:#fff;border-color:rgba(40,30,20,.18)}27%,100%{background:#6e5226;border-color:#6e5226}}
@keyframes kxd3mark1{0%,24%{opacity:0;transform:scale(.3)}32%,100%{opacity:1;transform:scale(1)}}
@keyframes kxd3box2{0%,50%{background:#fff;border-color:rgba(40,30,20,.18)}55%,100%{background:#6e5226;border-color:#6e5226}}
@keyframes kxd3mark2{0%,52%{opacity:0;transform:scale(.3)}60%,100%{opacity:1;transform:scale(1)}}
@keyframes kxd3prev{0%,54%{opacity:.4}64%,100%{opacity:1}}
@keyframes kxd3dl{0%,72%{box-shadow:0 0 0 0 rgba(169,126,51,0)}84%{box-shadow:0 0 0 6px rgba(169,126,51,.3)}100%{box-shadow:0 0 0 0 rgba(169,126,51,0)}}
.kx-pulse{border-style:dashed !important;border-color:#6e5226 !important;animation:kxpulse 1.9s ease-in-out infinite}
@keyframes kxpulse{0%,100%{box-shadow:0 0 0 0 rgba(110,82,38,.28)}50%{box-shadow:0 0 0 8px rgba(110,82,38,.07)}}
.kcap{display:inline-block;border-radius:999px;border:1px solid rgba(40,30,20,.12);background:#f7f1e7;padding:4px 11px;font-size:11px;font-weight:500;color:#5b5249}
.kcap b{font-weight:700;color:#6e5226}
/* "comece aqui": anel tracejado que pulsa saindo pra fora do card e some */
.kx-radiate{position:absolute;inset:0;border-radius:18px;border:2px dashed #6e5226;pointer-events:none;animation:kxradiate 1.8s ease-out infinite}
@keyframes kxradiate{0%{transform:scale(1);opacity:.5}70%{opacity:.12}100%{transform:scale(1.06);opacity:0}}
/* "trava": botão sacode na horizontal quando falta o catálogo */
.kx-shake{animation:kxshake .5s ease-in-out}
@keyframes kxshake{0%,100%{transform:translateX(0)}15%{transform:translateX(-9px)}30%{transform:translateX(8px)}45%{transform:translateX(-6px)}60%{transform:translateX(5px)}75%{transform:translateX(-3px)}}
/* destaque momentâneo do card 1 ao "bater na trava" */
.kx-pop{animation:kxpop .6s ease-out}
@keyframes kxpop{0%{transform:scale(1)}35%{transform:scale(1.035)}100%{transform:scale(1)}}
`;

const DEMO_1 = `<div class="kx-scr">
  <div class="kx-lbl">Descreva seu negócio</div>
  <div style="margin-top:8px;height:34px;border:1px solid rgba(40,30,20,.18);border-radius:8px;background:#fff;position:relative">
    <span class="kx-chip sm kx-loop" style="position:absolute;left:8px;top:6px;animation:kxd1file 6s ease-in-out infinite">📄 negócio.pdf</span>
    <span class="kx-loop" style="position:absolute;right:9px;top:8px;font-size:15px;animation:kxd1spark 6s ease-in-out infinite">✨</span>
  </div>
  <div style="margin-top:14px;display:grid;gap:9px">
    <div class="kx-row"><span style="width:64px;font-size:11px;color:#5b5249">Soluções</span><div class="kx-fieldbar" style="flex:1"><i class="kx-loop" style="animation:kxd1fill 6s ease-in-out infinite"></i></div><span class="kx-tick kx-loop" style="animation:kxd1tick 6s ease-in-out infinite">✓</span></div>
    <div class="kx-row"><span style="width:64px;font-size:11px;color:#5b5249">Planos</span><div class="kx-fieldbar" style="flex:1"><i class="kx-loop" style="animation:kxd1fill 6s ease-in-out infinite .15s"></i></div><span class="kx-tick kx-loop" style="animation:kxd1tick2 6s ease-in-out infinite">✓</span></div>
    <div class="kx-row"><span style="width:64px;font-size:11px;color:#5b5249">Argumentos</span><div class="kx-fieldbar" style="flex:1"><i class="kx-loop" style="animation:kxd1fill 6s ease-in-out infinite .3s"></i></div><span class="kx-tick kx-loop" style="animation:kxd1tick3 6s ease-in-out infinite">✓</span></div>
  </div>
</div>`;

const DEMO_2 = `<div class="kx-scr">
  <div style="display:flex;justify-content:center">
    <div class="kx-row" style="gap:0;border:1px solid rgba(40,30,20,.18);border-radius:8px;overflow:hidden">
      <span class="kx-chip sm" style="border:0;border-radius:0;background:#6e5226;color:#fff;font-size:9.5px;padding:4px 11px">🎙 Transcript</span>
      <span class="kx-chip sm" style="border:0;border-radius:0;background:#fff;color:#8a8175;font-size:9.5px;padding:4px 11px">Template</span>
    </div>
  </div>
  <div style="position:absolute;left:12px;top:40px;width:108px;border:1px solid rgba(40,30,20,.18);border-radius:8px;background:#fff;padding:7px">
    <div class="kx-row" style="gap:4px"><span style="width:7px;height:7px;border-radius:2px;background:#4285F4;display:inline-block"></span><span style="font-size:9px;font-weight:700">Cliente &lt;&gt; Você</span></div>
    <div style="height:1px;background:rgba(40,30,20,.12);margin:6px 0"></div>
    <div class="kx-lbl" style="font-size:7px">Anexos</div>
    <div class="kx-row" style="margin-top:4px"><span class="kx-chip sm" style="font-size:7.5px;padding:2px 5px">🎬 Gravação</span></div>
    <div class="kx-row" style="margin-top:4px"><span class="kx-chip sm kx-loop" style="font-size:7.5px;padding:2px 5px;border-color:#4285F4;color:#1a56c4;animation:kxd2click 6.5s ease-in-out infinite">📄 Transcript</span></div>
  </div>
  <span class="kx-chip sm kx-loop" style="position:absolute;left:22px;top:120px;font-size:7.5px;padding:2px 5px;border-color:#4285F4;color:#1a56c4;box-shadow:0 2px 8px rgba(66,133,244,.3);animation:kxd2ghost 6.5s ease-in-out infinite">📄 Transcript</span>
  <div class="kx-dropzone kx-loop" style="right:16px;top:44px;width:82px;height:92px;animation:kxd2zone 6.5s ease-in-out infinite">
    <div class="kx-loop" style="display:flex;flex-direction:column;align-items:center;gap:3px;animation:kxd2promptout 6.5s ease-in-out infinite">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M8 8l4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
      Solte no<br>gerador
    </div>
    <div class="kx-loop" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:9px;color:#5b5249;opacity:0;animation:kxd2donein 6.5s ease-in-out infinite">
      <span><span class="kx-tick">✓</span> Dores</span><span><span class="kx-tick">✓</span> Desejos</span><span><span class="kx-tick">✓</span> Contexto</span>
    </div>
  </div>
  <div class="kx-cursor kx-loop" style="animation:kxd2curs 6.5s ease-in-out infinite"><svg viewBox="0 0 24 24" fill="#2a2018"><path d="M4 2l7 18 2.5-7L20 10z"/></svg></div>
</div>`;

const DEMO_3 = `<div class="kx-scr">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;height:100%">
    <div style="display:grid;gap:8px;align-content:start">
      <div class="kx-lbl">Soluções</div>
      <div class="kx-row"><span class="kx-ck kx-loop" style="animation:kxd3box1 6s ease-in-out infinite"><svg class="kx-loop" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="animation:kxd3mark1 6s ease-in-out infinite"><path d="M5 13l4 4L19 7"/></svg></span><span style="font-size:11px">Gestão de tráfego</span></div>
      <div class="kx-row"><span class="kx-ck"></span><span style="font-size:11px;color:#8a8175">Branding</span></div>
      <div class="kx-row"><span class="kx-ck kx-loop" style="animation:kxd3box2 6s ease-in-out infinite"><svg class="kx-loop" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="animation:kxd3mark2 6s ease-in-out infinite"><path d="M5 13l4 4L19 7"/></svg></span><span style="font-size:11px">Automação</span></div>
    </div>
    <div class="kx-loop" style="border:1px solid rgba(40,30,20,.18);border-radius:8px;background:#fff;padding:8px;animation:kxd3prev 6s ease-in-out infinite">
      <div style="height:6px;width:60%;background:#c8a86a;border-radius:3px"></div>
      <div style="height:5px;width:90%;background:#e7ddc9;border-radius:3px;margin-top:6px"></div>
      <div style="height:5px;width:80%;background:#e7ddc9;border-radius:3px;margin-top:4px"></div>
      <div style="height:26px;background:#f2ead9;border-radius:5px;margin-top:8px"></div>
      <div class="kx-loop" style="margin-top:8px;text-align:center;background:#3a2b1c;color:#f6efe3;border-radius:7px;padding:6px;font-size:10.5px;font-weight:700;animation:kxd3dl 6s ease-in-out infinite">⬇ Baixar</div>
    </div>
  </div>
  <div class="kx-cursor kx-loop" style="animation:kxd3curs 6s ease-in-out infinite"><svg viewBox="0 0 24 24" fill="#2a2018"><path d="M4 2l7 18 2.5-7L20 10z"/></svg></div>
</div>`;

type Step = {
  n: number;
  href: string;
  kicker: string;
  title: string;
  desc: ReactNode;
  demo: string;
  caps: ReactNode;
};

const STEPS: Step[] = [
  {
    n: 1,
    href: "/empresa",
    kicker: "Uma vez só",
    title: "Seu catálogo, pela IA",
    desc: (
      <>
        Descreva seu negócio ou <b>solte um PDF/texto</b> — a IA escreve suas
        soluções, planos e argumentos. Ou preencha à mão.
      </>
    ),
    demo: DEMO_1,
    caps: (
      <span className="kcap">
        Com <b>PDF</b>, <b>texto</b> ou <b>à mão</b>
      </span>
    ),
  },
  {
    n: 2,
    href: "/cliente",
    kicker: "As dores do cliente",
    title: "Traga o contexto da reunião",
    desc: (
      <>
        Todo <b>Google Meet</b> vira um Docs de transcrição — faça o{" "}
        <b>upload</b> dele e a IA lê a conversa. Vale <b>qualquer transcript</b>,
        ou um template.
      </>
    ),
    demo: DEMO_2,
    caps: (
      <>
        <span className="kcap">
          📄 <b>Docs da reunião</b>
        </span>
        <span className="kcap">
          <b>ou template</b>
        </span>
      </>
    ),
  },
  {
    n: 3,
    href: "/cliente",
    kicker: "A cada proposta",
    title: "Monte e baixe",
    desc: (
      <>
        Escolha as soluções que <b>batem com a dor dele</b>, ajuste os textos no
        preview e baixe a proposta pronta.
      </>
    ),
    demo: DEMO_3,
    caps: (
      <>
        <span className="kcap">
          <b>selecione</b>
        </span>
        <span className="kcap">
          <b>lapide</b>
        </span>
        <span className="kcap">
          <b>baixe</b>
        </span>
      </>
    ),
  },
];

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export default function HomeWorkspace({ isNew = false }: { isNew?: boolean }) {
  const router = useRouter();
  const hasCatalog = !isNew;
  const [shake, setShake] = useState(false); // botão "trava" quando falta catálogo
  const [emphasize, setEmphasize] = useState(false); // destaca o card 1 na trava

  // "Criar uma proposta": com catálogo → vai pro Gerador. Sem catálogo → trava
  // (sacode) e joga o destaque pro Passo 1, ensinando a começar pelo catálogo.
  const onCreate = () => {
    if (hasCatalog) {
      router.push("/cliente");
      return;
    }
    setShake(false);
    setEmphasize(false);
    // reinicia as animações no próximo frame (pra retocar em cliques seguidos)
    requestAnimationFrame(() => {
      setShake(true);
      setEmphasize(true);
    });
    window.setTimeout(() => {
      setShake(false);
      setEmphasize(false);
    }, 700);
  };

  return (
    <div className="cream form-scroll h-full overflow-y-auto">
      <style>{KX_STYLE}</style>
      <div className="mx-auto max-w-5xl px-10 py-12">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-mute">
            Bem-vindo ao Kronos
          </span>
        </div>
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          Sua proposta pronta
          <br />
          em <span className="italic text-accent">3 passos</span>.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
          Do catálogo à proposta baixada — a{" "}
          <strong className="font-semibold text-ink">IA faz o trabalho pesado</strong>{" "}
          e você só lapida e envia.
        </p>

        {/* passos — clicáveis; o 1 pulsa tracejado pra conta nova */}
        <div className="mt-10 grid items-stretch gap-0 lg:grid-cols-[1fr_34px_1fr_34px_1fr]">
          {STEPS.map((s, i) => (
            <div key={s.n} className="contents">
              <Link
                href={s.href}
                className={`group relative flex flex-col rounded-[18px] border bg-panel p-5 shadow-[0_18px_40px_-30px_rgba(40,30,20,0.35)] transition hover:-translate-y-0.5 hover:border-accent/45 ${
                  isNew && s.n === 1
                    ? "kx-pulse border-2 border-accent"
                    : "border-line"
                } ${emphasize && s.n === 1 ? "kx-pop" : ""}`}
              >
                {isNew && s.n === 1 && <span className="kx-radiate" aria-hidden />}
                {isNew && s.n === 1 && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bg">
                    Comece aqui
                  </span>
                )}
                <div className="font-display text-[52px] font-semibold leading-[0.8] text-[#a97e33]">
                  {s.n}
                </div>
                <div className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent">
                  {s.kicker}
                </div>
                <div className="mt-0.5 font-display text-[26px] font-semibold leading-[1.05] text-ink">
                  {s.title}
                </div>
                <p className="mb-4 mt-3 text-[13.5px] leading-[1.5] text-ink-soft [&_b]:font-semibold [&_b]:text-ink">
                  {s.desc}
                </p>
                <div
                  className="kx-demo"
                  dangerouslySetInnerHTML={{ __html: s.demo }}
                />
                <div className="mt-3.5 flex flex-wrap gap-1.5">{s.caps}</div>
                {/* afordância explícita de que o card é clicável (o card todo é
                    o alvo — isto é só o sinal visual). Label universal pros 3 e
                    cor accent destacada, mais forte que as tags acima. */}
                <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/[0.12] px-3.5 py-1.5 text-[12px] font-semibold text-accent transition group-hover:border-accent group-hover:bg-accent/20">
                  Abrir
                  <span className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
              </Link>
              {i < STEPS.length - 1 && (
                <div className="hidden items-center justify-center text-[#c8a86a] lg:flex">
                  <ArrowRight />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA principal — centralizado (sob o 2º card), texto EMBAIXO. Sem
            catálogo, "trava" e destaca o Passo 1; com catálogo, vai pro Gerador. */}
        <div className="mt-10 flex flex-col items-center gap-2.5 text-center">
          <button
            type="button"
            onClick={onCreate}
            aria-disabled={!hasCatalog}
            className={`inline-flex items-center gap-2.5 rounded-xl bg-[#3a2b1c] px-6 py-3.5 text-[15px] font-semibold text-[#f6efe3] transition hover:opacity-90 ${
              shake ? "kx-shake" : ""
            }`}
          >
            Criar uma proposta <span className="text-[#c8a86a]">→</span>
          </button>
          <span className="max-w-xs text-balance text-[13px] leading-relaxed text-ink-mute">
            Leva ~1 minuto com a IA. Depois é só repetir a cada cliente.
          </span>
        </div>
      </div>
    </div>
  );
}

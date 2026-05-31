import Image from "next/image";
import Link from "next/link";

function IconEmpresa() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9h0M9 13h0M9 17h0M15 9h0M15 13h0M15 17h0" />
    </svg>
  );
}

function IconTemplates() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M12 3l9 5-9 5-9-5 9-5Z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  );
}

function IconGerador() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <rect x="2.5" y="7" width="19" height="13" rx="2" />
      <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" />
      <path d="M2.5 12.5h19" />
      <path d="M11 12.5h2v2h-2z" />
    </svg>
  );
}

type Step = {
  n: number;
  href: string;
  icon: React.ReactNode;
  tag: string;
  when: string;
  title: string;
  desc: string;
};

const STEPS: Step[] = [
  {
    n: 1,
    href: "/empresa",
    icon: <IconEmpresa />,
    tag: "Configure uma vez",
    when: "Setup único",
    title: "Sua Empresa",
    desc: "Cadastre suas soluções, planos e consultores. É o seu catálogo: preenche uma vez e reaproveita em todas as propostas.",
  },
  {
    n: 2,
    href: "/templates",
    icon: <IconTemplates />,
    tag: "Monte os argumentos",
    when: "Setup único",
    title: "Templates",
    desc: "Crie variações de texto para cada bloco (diagnóstico, custo, estratégia, recomendação...). São os argumentos que convencem — prontos pra reusar.",
  },
  {
    n: 3,
    href: "/cliente",
    icon: <IconGerador />,
    tag: "Gere em segundos",
    when: "A cada proposta",
    title: "Gerador",
    desc: "Com tudo setado, escolha soluções, planos e variações, ajuste os textos no preview e exporte. A proposta matadora sai em segundos.",
  },
];

export default function HomeWorkspace() {
  return (
    <div className="form-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-10 py-12">
        {/* Hero */}
        <div className="mb-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5">
            <Image
              src="/kronos-icone-areia.png"
              alt=""
              width={16}
              height={16}
              unoptimized
              className="h-4 w-4"
            />
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-mute">
              Bem-vindo ao Kronos
            </span>
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            Crie propostas sob medida
            <br />
            em <span className="italic text-accent">60 segundos</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft">
            O segredo é simples: você configura sua operação{" "}
            <strong className="font-semibold text-ink">uma única vez</strong> e,
            a partir daí, monta propostas matadoras em segundos — quantas quiser.
          </p>
        </div>

        {/* Como funciona */}
        <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-mute">
          Como funciona — 3 passos
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex flex-col rounded-2xl border border-line bg-panel p-5 transition hover:border-accent/40"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-panel-2 text-accent">
                  {s.icon}
                </span>
                <span className="grid h-6 w-6 place-items-center rounded-full border border-line text-xs font-semibold text-ink-mute">
                  {s.n}
                </span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                {s.tag}
              </span>
              <h3 className="mt-1.5 font-display text-xl font-semibold tracking-tight text-ink">
                {s.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                {s.desc}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink-mute transition group-hover:text-accent">
                Abrir <span aria-hidden>→</span>
              </span>
            </Link>
          ))}
        </div>

        {/* Setup x uso */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-panel/50 px-5 py-4">
          <span className="mt-0.5 text-lg leading-none" aria-hidden>
            ⏱️
          </span>
          <p className="text-sm leading-relaxed text-ink-soft">
            <strong className="font-semibold text-ink">
              Os passos 1 e 2 você faz uma vez só.
            </strong>{" "}
            Depois, cada nova proposta nasce no{" "}
            <strong className="font-semibold text-ink">passo 3</strong> em
            segundos — é só combinar o que já está pronto e exportar.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-10">
          <Link
            href="/empresa"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg transition hover:opacity-90"
          >
            Começar pela Sua Empresa
            <span aria-hidden>→</span>
          </Link>
          <p className="mt-3 text-xs text-ink-mute">
            Leva poucos minutos pra deixar tudo pronto. Depois é só colher.
          </p>
        </div>
      </div>
    </div>
  );
}

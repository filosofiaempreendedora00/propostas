import Image from "next/image";
import { requireUser, getCurrentOrg } from "@/lib/auth/org";
import { CHECKOUT } from "@/lib/billing/checkout";

export const dynamic = "force-dynamic";

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function PlanCard({
  name,
  tagline,
  price,
  features,
  monthly,
  annual,
  featured,
}: {
  name: string;
  tagline: string;
  price: string;
  features: string[];
  monthly: string;
  annual: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 ${
        featured ? "border-accent/60 bg-accent/[0.06]" : "border-line bg-panel"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bg">
          Mais escolhido
        </span>
      )}
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
        {name}
      </h2>
      <p className="mt-1 text-sm text-ink-mute">{tagline}</p>
      <div className="mt-4 flex items-end gap-1">
        <span className="text-sm text-ink-mute">R$</span>
        <span className="font-display text-4xl font-semibold text-ink">
          {price}
        </span>
        <span className="mb-1 text-sm text-ink-mute">/mês</span>
      </div>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-sm text-ink-soft">
            <Check />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-2">
        <a
          href={monthly || "#"}
          aria-disabled={!monthly}
          className={`rounded-full px-5 py-2.5 text-center text-sm font-semibold transition ${
            featured
              ? "bg-accent text-bg hover:opacity-90"
              : "border border-line text-ink hover:border-accent/60"
          } ${!monthly ? "pointer-events-none opacity-40" : ""}`}
        >
          Assinar mensal
        </a>
        <a
          href={annual || "#"}
          aria-disabled={!annual}
          className={`text-center text-xs text-ink-mute transition hover:text-accent ${
            !annual ? "pointer-events-none opacity-40" : ""
          }`}
        >
          ou economize no plano anual →
        </a>
      </div>
    </div>
  );
}

export default async function PlanosPage() {
  const user = await requireUser();
  const org = await getCurrentOrg();
  const canceled = org?.status === "canceled";

  return (
    <div className="min-h-screen bg-bg px-5 py-12 text-ink">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-9 flex flex-col items-center text-center">
          <Image
            src="/kronos-symbol.png"
            alt="Kronos"
            width={40}
            height={40}
            priority
            unoptimized
            className="h-10 w-10 select-none"
          />
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">
            {canceled ? "Sua assinatura terminou" : "Escolha seu plano"}
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-ink-mute">
            {canceled
              ? "Reative para voltar a gerar propostas. Seus dados continuam salvos."
              : "Assine para liberar o gerador. Cancele quando quiser."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PlanCard
            name="Individual"
            tagline="Para o vendedor que quer render como um time."
            price="67"
            monthly={CHECKOUT.individual.monthly}
            annual={CHECKOUT.individual.annual}
            features={[
              "1 usuário",
              "Soluções e planos ilimitados",
              "Propostas ilimitadas",
              "Geração em 60 segundos",
              "Suporte por e-mail e chat",
              "Cancele quando quiser",
            ]}
          />
          <PlanCard
            name="Time"
            tagline="Para multiplicar o comercial inteiro."
            price="197"
            featured
            monthly={CHECKOUT.time.monthly}
            annual={CHECKOUT.time.annual}
            features={[
              "Tudo do Individual",
              "Até 10 usuários",
              "Catálogo compartilhado pelo time",
              "Padrão único de marca",
              "Variações por vendedor",
              "Suporte prioritário por WhatsApp",
            ]}
          />
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <a
            href="/inicio"
            className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink-soft transition hover:border-accent/60 hover:text-ink"
          >
            Já assinei — entrar
          </a>
          <p className="text-[11px] text-ink-mute">
            Use o mesmo e-mail da compra: <strong>{user.email}</strong>.
          </p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-[11px] text-accent hover:underline"
            >
              Trocar conta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

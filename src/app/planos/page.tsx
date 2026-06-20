import Image from "next/image";
import { requireUser, getCurrentOrg } from "@/lib/auth/org";
import { CHECKOUT } from "@/lib/billing/checkout";
import PlansChooser from "@/app/_components/PlansChooser";

export const dynamic = "force-dynamic";

export default async function PlanosPage() {
  const user = await requireUser();
  const org = await getCurrentOrg();
  const canceled = org?.status === "canceled";

  return (
    <div className="min-h-screen bg-bg px-5 py-12 text-ink">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex flex-col items-center text-center">
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
              : "Comece pelo Individual ou escale com o Time. No plano anual você economiza."}
          </p>
        </div>

        <PlansChooser
          email={user.email ?? null}
          individual={{
            monthly: CHECKOUT.individual.monthly,
            annual: CHECKOUT.individual.annual,
          }}
          time={{
            monthly: CHECKOUT.time.monthly,
            annual: CHECKOUT.time.annual,
          }}
        />

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

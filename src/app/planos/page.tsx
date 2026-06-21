import Image from "next/image";
import { redirect } from "next/navigation";
import { requireUser, getCurrentOrg } from "@/lib/auth/org";
import { FREE_DOWNLOADS } from "@/lib/limits";
import { CHECKOUT } from "@/lib/billing/checkout";
import PlansChooser from "@/app/_components/PlansChooser";
import PlanosActions from "@/app/_components/PlanosActions";

export const dynamic = "force-dynamic";

export default async function PlanosPage() {
  const user = await requireUser();
  const org = await getCurrentOrg();

  // Assinante não tem o que fazer aqui — manda pro app.
  if (org?.status === "active") redirect("/inicio");

  const canceled = org?.status === "canceled";
  const used = org?.downloadsUsed ?? 0;
  const remaining = Math.max(0, FREE_DOWNLOADS - used);
  const locked = used >= FREE_DOWNLOADS; // free e esgotou os downloads

  const heading = canceled
    ? "Sua assinatura terminou"
    : locked
      ? `Você usou suas ${FREE_DOWNLOADS} propostas grátis`
      : "Escolha seu plano";
  const subheading = canceled
    ? "Reative para voltar a gerar propostas. Seus dados continuam salvos."
    : locked
      ? "Assine para continuar gerando propostas — seus dados continuam salvos."
      : null;

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
            {heading}
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-ink-mute">
            {subheading ?? (
              <>
                Comece pelo Individual ou escale com o Time.
                <br />
                No plano anual você economiza em até 40%.
              </>
            )}
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

        <PlanosActions
          email={user.email ?? null}
          locked={locked}
          remaining={remaining}
        />
      </div>
    </div>
  );
}

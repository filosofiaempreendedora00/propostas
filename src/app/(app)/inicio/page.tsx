import HomeWorkspace from "@/app/_components/HomeWorkspace";
import {
  hasRealCatalog,
  hasTranscriptGeneration,
} from "@/lib/catalog/actions";

// Depende do estado do catálogo (muda após gerar) — sempre recalcular.
export const dynamic = "force-dynamic";

export default async function InicioPage({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string }>;
}) {
  // Conta nova (sem catálogo real) → /inicio lidera com o onboarding por IA.
  // ?novo=1 força o estado "sem catálogo" pra QA (ver o pulse/trava sem zerar
  // o catálogo real).
  const sp = await searchParams;
  const forceNew = sp?.novo === "1";
  const [configured, hasProposal] = await Promise.all([
    forceNew ? Promise.resolve(false) : hasRealCatalog().catch(() => false),
    forceNew
      ? Promise.resolve(false)
      : hasTranscriptGeneration().catch(() => false),
  ]);
  return <HomeWorkspace isNew={!configured} hasProposal={hasProposal} />;
}

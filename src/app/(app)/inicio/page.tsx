import HomeWorkspace from "@/app/_components/HomeWorkspace";
import { hasRealCatalog } from "@/lib/catalog/actions";

// Depende do estado do catálogo (muda após gerar) — sempre recalcular.
export const dynamic = "force-dynamic";

export default async function InicioPage() {
  // Conta nova (sem catálogo real) → /inicio lidera com o onboarding por IA.
  const configured = await hasRealCatalog().catch(() => false);
  return <HomeWorkspace isNew={!configured} />;
}

import Sidebar from "@/app/_components/Sidebar";
import TrialBar from "@/app/_components/TrialBar";
import CatalogNudge from "@/app/_components/CatalogNudge";
import RegistrationPixel from "@/app/_components/RegistrationPixel";
import { isCurrentUserAdmin } from "@/lib/admin/data";
import { getAccessState } from "@/lib/auth/org";
import { hasRealCatalog } from "@/lib/catalog/actions";

// Layout das telas autenticadas — inclui a barra lateral.
// Freemium: em teste, todo usuário usa o app e o limite incide no DOWNLOAD.
// Mas quem ESGOTOU a cota grátis (e não assinou) fica preso em /planos.
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAdmin, access, hasCatalog] = await Promise.all([
    isCurrentUserAdmin(),
    getAccessState(),
    // Na dúvida (erro/sem org), trata como "tem" pra NÃO incomodar à toa.
    hasRealCatalog().catch(() => true),
  ]);

  // Modelo MARCA D'ÁGUA: não há mais hard-paywall. Free usa o app à vontade e
  // baixa com marca d'água; a conversão vem do CTA de desbloqueio, não de travar.
  const paid = access.active;

  // Ativação: sem catálogo, a pessoa nem consegue montar proposta. Enquanto não
  // tiver, uma faixa a puxa pro catálogo (prioridade sobre a de teste grátis).
  const needsCatalog = !isAdmin && !hasCatalog;

  return (
    <div className="flex h-screen flex-col">
      {/* Dispara CompleteRegistration no 1º acesso após um cadastro novo (?novo=1) */}
      <RegistrationPixel />
      {/* Sem catálogo → faixa de ativação; senão, faixa de teste (free não-admin) */}
      {needsCatalog ? (
        <CatalogNudge />
      ) : (
        !paid && !isAdmin && <TrialBar />
      )}
      <div className="flex min-h-0 flex-1">
        <Sidebar isAdmin={isAdmin} needsCatalog={needsCatalog} />
        <main className="min-h-0 min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

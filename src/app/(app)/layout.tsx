import Sidebar from "@/app/_components/Sidebar";
import TrialBar from "@/app/_components/TrialBar";
import OnboardingBar from "@/app/_components/OnboardingBar";
import RegistrationPixel from "@/app/_components/RegistrationPixel";
import { isCurrentUserAdmin } from "@/lib/admin/data";
import { getAccessState } from "@/lib/auth/org";
import {
  hasRealCatalog,
  hasTranscriptGeneration,
} from "@/lib/catalog/actions";

// Layout das telas autenticadas — inclui a barra lateral.
// Freemium: em teste, todo usuário usa o app e o limite incide no DOWNLOAD.
// Mas quem ESGOTOU a cota grátis (e não assinou) fica preso em /planos.
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAdmin, access, hasCatalog, hasProposal] = await Promise.all([
    isCurrentUserAdmin(),
    getAccessState(),
    // Na dúvida (erro/sem org), trata como "tem" pra NÃO incomodar à toa.
    hasRealCatalog().catch(() => true),
    hasTranscriptGeneration().catch(() => false),
  ]);

  // Modelo MARCA D'ÁGUA: não há mais hard-paywall. Free usa o app à vontade e
  // baixa com marca d'água; a conversão vem do CTA de desbloqueio, não de travar.
  const paid = access.active;
  const hasDownloaded = access.used >= 1; // 1º download = fim do onboarding
  const needsCatalog = !isAdmin && !hasCatalog; // pontinho na sidebar

  return (
    <div className="flex h-screen flex-col">
      {/* Dispara CompleteRegistration no 1º acesso após um cadastro novo (?novo=1) */}
      <RegistrationPixel />
      {/* Duas barras com papéis diferentes: ONBOARDING (progresso dos 3 passos,
          some após o 1º download; não aparece na home) + CONVERSÃO (marca
          d'água → assinar, só free não-admin). */}
      {!isAdmin && (
        <OnboardingBar
          hasCatalog={hasCatalog}
          hasProposal={hasProposal}
          hasDownloaded={hasDownloaded}
        />
      )}
      {!paid && !isAdmin && <TrialBar />}
      <div className="flex min-h-0 flex-1">
        <Sidebar isAdmin={isAdmin} needsCatalog={needsCatalog} />
        <main className="min-h-0 min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

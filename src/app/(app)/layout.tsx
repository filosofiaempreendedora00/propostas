import Sidebar from "@/app/_components/Sidebar";
import TrialBar from "@/app/_components/TrialBar";
import RegistrationPixel from "@/app/_components/RegistrationPixel";
import { isCurrentUserAdmin } from "@/lib/admin/data";
import { getAccessState } from "@/lib/auth/org";

// Layout das telas autenticadas — inclui a barra lateral.
// Freemium: em teste, todo usuário usa o app e o limite incide no DOWNLOAD.
// Mas quem ESGOTOU a cota grátis (e não assinou) fica preso em /planos.
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAdmin, access] = await Promise.all([
    isCurrentUserAdmin(),
    getAccessState(),
  ]);

  // Modelo MARCA D'ÁGUA: não há mais hard-paywall. Free usa o app à vontade e
  // baixa com marca d'água; a conversão vem do CTA de desbloqueio, não de travar.
  const paid = access.active;

  return (
    <div className="flex h-screen flex-col">
      {/* Dispara CompleteRegistration no 1º acesso após um cadastro novo (?novo=1) */}
      <RegistrationPixel />
      {/* Faixa de teste gratuito — só para quem ainda não assinou (admin não vê) */}
      {!paid && !isAdmin && <TrialBar />}
      <div className="flex min-h-0 flex-1">
        <Sidebar isAdmin={isAdmin} />
        <main className="min-h-0 min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

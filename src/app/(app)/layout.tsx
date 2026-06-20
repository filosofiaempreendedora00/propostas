import Sidebar from "@/app/_components/Sidebar";
import TrialBar from "@/app/_components/TrialBar";
import { isCurrentUserAdmin } from "@/lib/admin/data";
import { hasActiveAccess } from "@/lib/auth/org";

// Layout das telas autenticadas — inclui a barra lateral.
// Freemium: todo usuário entra e usa o app; o limite incide só no DOWNLOAD
// da proposta (cota grátis), tratado no Gerador.
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAdmin, paid] = await Promise.all([
    isCurrentUserAdmin(),
    hasActiveAccess(),
  ]);

  return (
    <div className="flex h-screen flex-col">
      {/* Faixa de teste gratuito — só para quem ainda não assinou */}
      {!paid && <TrialBar />}
      <div className="flex min-h-0 flex-1">
        <Sidebar isAdmin={isAdmin} />
        <main className="min-h-0 min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

import Sidebar from "@/app/_components/Sidebar";
import { isCurrentUserAdmin } from "@/lib/admin/data";

// Layout das telas autenticadas — inclui a barra lateral.
// Freemium: todo usuário entra e usa o app; o limite incide só no DOWNLOAD
// da proposta (cota grátis), tratado no Gerador.
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAdmin = await isCurrentUserAdmin();

  return (
    <div className="flex h-screen">
      <Sidebar isAdmin={isAdmin} />
      <main className="min-h-0 min-w-0 flex-1">{children}</main>
    </div>
  );
}

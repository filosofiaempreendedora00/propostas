import { redirect } from "next/navigation";
import Sidebar from "@/app/_components/Sidebar";
import { hasActiveAccess } from "@/lib/auth/org";
import { isCurrentUserAdmin } from "@/lib/admin/data";

// Layout das telas autenticadas — inclui a barra lateral.
// Paywall: sem assinatura ativa → manda pra /planos.
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!(await hasActiveAccess())) redirect("/planos");
  const isAdmin = await isCurrentUserAdmin();

  return (
    <div className="flex h-screen">
      <Sidebar isAdmin={isAdmin} />
      <main className="min-h-0 min-w-0 flex-1">{children}</main>
    </div>
  );
}

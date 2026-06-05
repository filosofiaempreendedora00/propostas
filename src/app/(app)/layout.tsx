import Sidebar from "@/app/_components/Sidebar";

// Layout das telas autenticadas — inclui a barra lateral.
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="min-h-0 min-w-0 flex-1">{children}</main>
    </div>
  );
}

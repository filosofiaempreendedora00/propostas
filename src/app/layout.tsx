import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./_components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Gerador de Propostas",
  description: "Gerador universal de propostas comerciais sofisticadas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="flex h-screen">
          <Sidebar />
          <main className="min-h-0 min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}

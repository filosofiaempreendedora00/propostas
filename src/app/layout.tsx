import type { Metadata } from "next";
import { Instrument_Sans, Cormorant } from "next/font/google";
import "./globals.css";
import Sidebar from "./_components/Sidebar";

// Corpo / interface
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

// Display / títulos e destaques
const cormorant = Cormorant({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
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
    <html
      lang="pt-BR"
      className={`${instrumentSans.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex h-screen">
          <Sidebar />
          <main className="min-h-0 min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}

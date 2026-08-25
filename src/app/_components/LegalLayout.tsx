import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

// Chrome compartilhado das páginas legais (Termos / Privacidade). Tema claro
// (creme) pra leitura confortável de texto longo; cores em hex fixo pra não
// depender de tema. Público (sem login).
export function LegalLayout({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4eee3] px-5 py-10 text-[#2a2018]">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Image
            src="/kronos-logo-dark.png"
            alt="Kronos"
            width={180}
            height={54}
            priority
            unoptimized
            className="h-9 w-auto select-none"
          />
          <Link
            href="/cadastro"
            className="shrink-0 text-sm font-medium text-[#6e5226] transition hover:underline"
          >
            ← Voltar ao cadastro
          </Link>
        </div>

        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[#8a8175]">
          Última atualização: {updated}
        </p>
        {intro && (
          <p className="mt-4 text-[15px] leading-relaxed text-[#3f382f]">
            {intro}
          </p>
        )}

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-[#3f382f]">
          {children}
        </div>

        <div className="mt-12 border-t border-[#dcd0bb] pt-6 text-[13px] text-[#8a8175]">
          Kronos ·{" "}
          <Link href="/termos" className="transition hover:underline">
            Termos de Uso
          </Link>{" "}
          ·{" "}
          <Link
            href="/politica-de-privacidade"
            className="transition hover:underline"
          >
            Política de Privacidade
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h2 className="font-display text-xl font-semibold text-[#2a2018]">
        {title}
      </h2>
      <div className="space-y-2.5 [&_a]:font-medium [&_a]:text-[#6e5226] [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-1 [&_strong]:text-[#2a2018] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

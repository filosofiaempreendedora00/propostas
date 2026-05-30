"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/empresa", label: "Sua Empresa", hint: "Catálogo de soluções" },
  { href: "/cliente", label: "Seu Cliente", hint: "Montar proposta" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header className="flex items-center gap-6 border-b border-line px-6 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-accent font-semibold text-bg">
          P
        </div>
        <span className="text-sm font-semibold tracking-tight">Propostas</span>
      </div>

      <nav className="flex items-center gap-1">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              title={t.hint}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-panel text-ink"
                  : "text-ink-mute hover:text-ink-soft"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

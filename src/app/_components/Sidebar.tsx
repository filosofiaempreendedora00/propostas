"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const COLLAPSE_KEY = "propostas.sidebar.collapsed";

function IconHome({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

function IconEmpresa({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9h0M9 13h0M9 17h0M15 9h0M15 13h0M15 17h0" />
    </svg>
  );
}

function IconGerador({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2.5" y="7" width="19" height="13" rx="2" />
      <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" />
      <path d="M2.5 12.5h19" />
      <path d="M11 12.5h2v2h-2z" />
    </svg>
  );
}

function IconTemplates({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3l9 5-9 5-9-5 9-5Z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  );
}

function Chevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

const ITEMS = [
  { href: "/inicio", label: "Início", Icon: IconHome, highlight: false },
  { href: "/empresa", label: "Sua Empresa", Icon: IconEmpresa, highlight: false },
  { href: "/templates", label: "Templates", Icon: IconTemplates, highlight: false },
  { href: "/cliente", label: "Gerador", Icon: IconGerador, highlight: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignora */
    }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignora */
      }
      return next;
    });
  };

  // Evita "piscar" antes de ler o localStorage.
  const isCollapsed = mounted ? collapsed : false;

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-line transition-[width] duration-200 ${
        isCollapsed ? "w-[64px]" : "w-56"
      }`}
    >
      {/* Brand */}
      <div className="flex items-center px-4 py-4">
        {isCollapsed ? (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent font-semibold text-bg">
            K
          </div>
        ) : (
          <Image
            src="/kronos-logo.png"
            alt="Kronos"
            width={94}
            height={28}
            priority
            unoptimized
            className="h-7 w-auto select-none"
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-2.5 py-2">
        {ITEMS.map(({ href, label, Icon, highlight }) => {
          const active = pathname.startsWith(href);

          // "Gerador" — onde tudo acontece. Destaque pelo SELO do ícone (maleta
          // com areia caindo + brilho) e texto claro, sem preencher a linha —
          // assim chama atenção sem parecer uma aba selecionada.
          if (highlight) {
            return (
              <Link
                key={href}
                href={href}
                title={isCollapsed ? label : undefined}
                className={`mt-1 flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-panel text-ink" : "text-ink hover:bg-panel/40"
                } ${isCollapsed ? "justify-center" : ""}`}
              >
                <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md border border-accent/45 bg-accent/15 shadow-[0_0_12px_-3px_rgba(168,144,112,0.75)]">
                  <span
                    aria-hidden
                    className="kronos-sand pointer-events-none absolute inset-0 opacity-70"
                  />
                  <Icon className="relative h-4 w-4 text-accent" />
                </span>
                {!isCollapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              title={isCollapsed ? label : undefined}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-panel text-ink"
                  : "text-ink-mute hover:bg-panel/50 hover:text-ink-soft"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Toggle */}
      <button
        onClick={toggle}
        title={isCollapsed ? "Expandir" : "Recolher"}
        className={`flex items-center gap-3 border-t border-line px-4 py-3 text-xs font-medium text-ink-mute transition hover:text-ink-soft ${
          isCollapsed ? "justify-center" : ""
        }`}
      >
        <Chevron collapsed={isCollapsed} />
        {!isCollapsed && <span>Recolher</span>}
      </button>
    </aside>
  );
}

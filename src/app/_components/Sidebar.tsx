"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const COLLAPSE_KEY = "propostas.sidebar.collapsed";

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

function IconCliente({ className = "" }: { className?: string }) {
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
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
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
  { href: "/empresa", label: "Sua Empresa", Icon: IconEmpresa },
  { href: "/cliente", label: "Seu Cliente", Icon: IconCliente },
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
      className={`flex h-full shrink-0 flex-col border-r border-line bg-bg transition-[width] duration-200 ${
        isCollapsed ? "w-[64px]" : "w-56"
      }`}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent font-semibold text-bg">
          P
        </div>
        {!isCollapsed && (
          <span className="truncate text-sm font-semibold tracking-tight">
            Propostas
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-2.5 py-2">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
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

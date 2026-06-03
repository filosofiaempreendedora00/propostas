"use client";

import { useEffect, useState } from "react";
import CatalogManager from "./CatalogManager";
import ConsultantsManager from "./ConsultantsManager";
import BrandManager from "./BrandManager";

const TAB_KEY = "propostas.empresa.tab";
type Tab = "solucoes" | "consultores" | "marca";

export default function EmpresaWorkspace() {
  const [tab, setTab] = useState<Tab>("solucoes");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TAB_KEY);
      if (saved === "solucoes" || saved === "consultores" || saved === "marca")
        setTab(saved);
    } catch {
      /* ignora */
    }
  }, []);

  const change = (t: Tab) => {
    setTab(t);
    try {
      window.localStorage.setItem(TAB_KEY, t);
    } catch {
      /* ignora */
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Sub-abas */}
      <div className="flex items-center gap-1 border-b border-line px-4 py-2.5">
        {(
          [
            { id: "solucoes", label: "Soluções & Planos" },
            { id: "consultores", label: "Consultores" },
            { id: "marca", label: "Marca" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => change(t.id)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "bg-panel text-ink"
                : "text-ink-mute hover:text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {tab === "solucoes" && <CatalogManager />}
        {tab === "consultores" && <ConsultantsManager />}
        {tab === "marca" && <BrandManager />}
      </div>
    </div>
  );
}

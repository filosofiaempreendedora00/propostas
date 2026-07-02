"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import CatalogManager from "./CatalogManager";
import ConsultantsManager from "./ConsultantsManager";
import BrandManager from "./BrandManager";
import TeamManager from "./TeamManager";

const TAB_KEY = "propostas.empresa.tab";
type Tab = "solucoes" | "consultores" | "marca" | "equipe";
const TABS: Tab[] = ["solucoes", "consultores", "marca", "equipe"];

// Roda antes da pintura no cliente (evita o "flash" da aba padrão ao navegar);
// cai pra useEffect no servidor pra não emitir aviso de SSR.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function EmpresaWorkspace() {
  const [tab, setTab] = useState<Tab>("solucoes");
  // Destaque vindo do clique na logo do Gerador (?marca=clara|escura).
  const [highlight, setHighlight] = useState<"clara" | "escura" | null>(null);

  useIsoLayoutEffect(() => {
    try {
      // Veio do clique na logo do preview (?marca=clara|escura)? Abre "Sua
      // marca" e destaca o campo. Ler da URL é idempotente sob StrictMode (não
      // consumimos aqui) — a limpeza acontece só quando o usuário troca de aba.
      const marca = new URLSearchParams(window.location.search).get("marca");
      if (marca === "clara" || marca === "escura") {
        setTab("marca");
        setHighlight(marca);
        return;
      }
      const saved = window.localStorage.getItem(TAB_KEY) as Tab | null;
      if (saved && TABS.includes(saved)) setTab(saved);
    } catch {
      /* ignora */
    }
  }, []);

  const change = (t: Tab) => {
    setTab(t);
    try {
      window.localStorage.setItem(TAB_KEY, t);
      // Interação manual → limpa o ?marca da URL (evita reabrir na atualização).
      if (new URLSearchParams(window.location.search).has("marca")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch {
      /* ignora */
    }
  };

  return (
    <div className="cream flex h-full flex-col">
      {/* Sub-abas */}
      <div className="flex items-center gap-1 border-b border-line px-4 py-2.5">
        {(
          [
            { id: "solucoes", label: "Soluções & Planos" },
            { id: "consultores", label: "Consultores" },
            { id: "marca", label: "Sua marca" },
            { id: "equipe", label: "Equipe" },
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
        {tab === "marca" && <BrandManager highlight={highlight} />}
        {tab === "equipe" && <TeamManager />}
      </div>
    </div>
  );
}

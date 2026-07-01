"use client";

import { useEffect } from "react";

// Atribuição de origem (first-touch): na 1ª visita, grava em cookies o rótulo
// (kronos_src=facebook|google) e os IDs de clique crus (kronos_gclid do Google
// Ads, kronos_fbclid do Meta) — usados para importar conversão offline. Lidos
// no servidor ao criar a conta (ver requireOrgId) e ligados à org.
export default function AttributionCapture() {
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const year = 60 * 60 * 24 * 365;
      // First-touch: só grava se ainda não existir (preserva a origem original).
      const setOnce = (name: string, value: string) => {
        if (!value) return;
        if (new RegExp(`(?:^|;\\s*)${name}=`).test(document.cookie)) return;
        document.cookie = `${name}=${encodeURIComponent(
          value,
        )}; path=/; max-age=${year}; samesite=lax`;
      };

      const gclid = p.get("gclid") || p.get("gbraid") || p.get("wbraid") || "";
      const fbclid = p.get("fbclid") || "";
      setOnce("kronos_gclid", gclid);
      setOnce("kronos_fbclid", fbclid);
      // 1ª URL de entrada COMPLETA (com UTMs) — a origem é derivada no servidor.
      setOnce("kronos_first_url", window.location.href.slice(0, 900));
    } catch {
      /* ignora */
    }
  }, []);
  return null;
}

"use client";

import { useEffect } from "react";

// Atribuição de origem (first-touch): na 1ª visita com fbclid/gclid/utm_source,
// grava um cookie kronos_src=facebook|google. Lido no servidor ao criar a conta
// (ver requireOrgId) e exibido como tag no painel master.
export default function AttributionCapture() {
  useEffect(() => {
    try {
      if (/(?:^|;\s*)kronos_src=/.test(document.cookie)) return; // first-touch
      const p = new URLSearchParams(window.location.search);
      const utm = (p.get("utm_source") || "").toLowerCase();
      let src: string | null = null;
      if (p.get("fbclid") || /face|meta|insta|ig\b|fb/.test(utm)) {
        src = "facebook";
      } else if (
        p.get("gclid") ||
        p.get("gbraid") ||
        p.get("wbraid") ||
        /google|adwords|gads/.test(utm)
      ) {
        src = "google";
      }
      if (src) {
        const year = 60 * 60 * 24 * 365;
        document.cookie = `kronos_src=${src}; path=/; max-age=${year}; samesite=lax`;
      }
    } catch {
      /* ignora */
    }
  }, []);
  return null;
}

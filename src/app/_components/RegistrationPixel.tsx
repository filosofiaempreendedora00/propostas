"use client";

import { useEffect, useRef } from "react";
import { trackGoogleConversion, GADS_CONVERSIONS } from "@/lib/analytics/google";

// Dispara o evento CompleteRegistration do Meta Pixel UMA ÚNICA VEZ, no sucesso
// de um cadastro novo. O sinal é o parâmetro ?novo=1 na URL — colocado APÓS a
// conta ser criada no backend (cadastro por e-mail e Google novo). Login
// recorrente nunca recebe esse parâmetro, então nunca dispara.
//
// Idempotência: assim que detecta, remove o parâmetro da URL (refresh não
// re-dispara) e usa um guard de ref (re-render não re-dispara).
export default function RegistrationPixel() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("novo") !== "1") return;

    done.current = true;

    // Limpa o parâmetro da URL imediatamente (sem recarregar a página).
    params.delete("novo");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : ""),
    );

    // Dispara o evento — esperando o fbq estar disponível (script afterInteractive).
    // Em ambientes sem pixel (dev), fbq não existe e nada acontece.
    let tries = 0;
    const fire = () => {
      const fbq = (window as Window & { fbq?: (...a: unknown[]) => void }).fbq;
      if (typeof fbq === "function") {
        fbq("track", "CompleteRegistration");
      } else if (tries++ < 20) {
        setTimeout(fire, 150);
      }
    };
    fire();

    // Google Ads — conversão de cadastro, no MESMO ponto. (no-op em dev/sem tag)
    trackGoogleConversion(GADS_CONVERSIONS.cadastro);
  }, []);

  return null;
}

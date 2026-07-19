// Conversões do Google Ads (gtag). Um lugar só pros labels — adicionar um novo
// evento é só pôr a linha aqui e chamar trackGoogleConversion() no ponto certo.
//
// A tag base (gtag.js) é carregada em src/app/_components/GoogleTag.tsx,
// só em produção. Em dev/sem tag, o disparo abaixo é no-op.

export const GADS_CONVERSIONS = {
  // Conversão de CADASTRO (mesmo ponto do CompleteRegistration da Meta).
  cadastro: "AW-730378227/S8kDCK-qisccEPPfotwC",
  // ATIVAÇÃO: 1ª proposta baixada com sucesso (mesmo ponto do BaixouPrimeiraProposta).
  primeiraProposta: "AW-730378227/lEi_CILMocccEPPfotwC",
} as const;

type Gtag = (...args: unknown[]) => void;

// Id anônimo de 1º toque (localStorage) — costura pré-login → pós-login no funil.
// Gera na 1ª visita e persiste. Falha silenciosa (SSR / storage bloqueado).
function getAnonId(): string {
  try {
    if (typeof localStorage === "undefined") return "";
    const K = "kronos:anon";
    let v = localStorage.getItem(K);
    if (!v) {
      v =
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
      localStorage.setItem(K, v);
    }
    return v;
  } catch {
    return "";
  }
}

// Eventos de FUNIL (não são conversões pagas do Ads — são eventos GA4 + Meta
// para medir onde o onboarding vaza). Um lugar só: adicionar é pôr a linha e
// chamar trackFunnel() no ponto certo. No-op em dev/sem tag.
export function trackFunnel(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    gtag?: Gtag;
    fbq?: (...a: unknown[]) => void;
  };
  try {
    if (typeof w.gtag === "function") w.gtag("event", name, params ?? {});
  } catch {
    /* ignora */
  }
  try {
    if (typeof w.fbq === "function") w.fbq("trackCustom", name, params ?? {});
  } catch {
    /* ignora */
  }
  // Persiste no NOSSO banco (POST /api/funnel) — device é derivado no servidor.
  // sendBeacon: não bloqueia navegação e sobrevive ao unload (eventos de saída).
  try {
    const payload = JSON.stringify({
      event: name,
      params: params ?? {},
      anon_id: getAnonId(),
      path: location.pathname,
    });
    navigator.sendBeacon?.(
      "/api/funnel",
      new Blob([payload], { type: "application/json" }),
    );
  } catch {
    /* ignora */
  }
}

// Dispara uma conversão do Google Ads. Espera o gtag carregar (script
// afterInteractive) com algumas tentativas curtas; se nunca aparecer
// (dev local, ad-blocker), simplesmente não faz nada.
// A idempotência (disparar uma vez só) é responsabilidade de quem chama.
export function trackGoogleConversion(sendTo: string): void {
  if (typeof window === "undefined") return;
  let tries = 0;
  const fire = () => {
    const gtag = (window as Window & { gtag?: Gtag }).gtag;
    if (typeof gtag === "function") {
      gtag("event", "conversion", { send_to: sendTo });
    } else if (tries++ < 20) {
      setTimeout(fire, 150);
    }
  };
  fire();
}

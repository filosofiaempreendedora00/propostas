// Conversões do Google Ads (gtag). Um lugar só pros labels — adicionar um novo
// evento é só pôr a linha aqui e chamar trackGoogleConversion() no ponto certo.
//
// A tag base (gtag.js) é carregada em src/app/_components/GoogleTag.tsx,
// só em produção. Em dev/sem tag, o disparo abaixo é no-op.

export const GADS_CONVERSIONS = {
  // Conversão de CADASTRO (mesmo ponto do CompleteRegistration da Meta).
  cadastro: "AW-730378227/S8kDCK-qisccEPPfotwC",
  // primeiraProposta: "AW-730378227/XXXXXXXXXXXXXXXX", // (em breve — outro label)
} as const;

type Gtag = (...args: unknown[]) => void;

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

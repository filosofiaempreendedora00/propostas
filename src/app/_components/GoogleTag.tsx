import Script from "next/script";

// ID público do Google tag (gtag.js) — Google Ads / GA4 (não é segredo).
const GA_ID = "G-NW70BBHDMF";

// Google tag (gtag.js) — rastreia visitas e conversões do Google Ads.
// Carrega depois da página (afterInteractive) e SÓ em produção (build da
// Vercel) — no dev local não roda, pra não poluir os dados.
export default function GoogleTag() {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}

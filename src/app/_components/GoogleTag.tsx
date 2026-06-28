import Script from "next/script";

// IDs públicos do Google tag (gtag.js) — não são segredo. Os dois rodam no
// MESMO gtag.js: GA4 (Analytics) + Google Ads (conversões, mesmo ID da landing).
const TAG_IDS = ["AW-730378227", "G-NW70BBHDMF"] as const;
const PRIMARY = TAG_IDS[0]; // id usado no src (carrega a lib uma vez só)

// Google tag (gtag.js) — Analytics + Google Ads (conversões).
// Carrega depois da página (afterInteractive — recomendado p/ tag managers) e
// SÓ em produção (build da Vercel) — no dev local não roda, pra não poluir os
// dados. As conversões são disparadas em src/lib/analytics/google.ts.
export default function GoogleTag() {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${PRIMARY}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${TAG_IDS.map((id) => `gtag('config', '${id}');`).join("\n")}`}
      </Script>
    </>
  );
}

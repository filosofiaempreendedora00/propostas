import Script from "next/script";

// UM ÚNICO Google tag (gtag.js) para o app inteiro — o tag do GA4 (G-NW70BBHDMF).
// O Google Ads (AW-730378227) está LINKADO a ele na conta Google, então carrega
// junto AUTOMATICAMENTE ("um Google tag por conta"). Por isso NÃO configuramos
// o AW separado aqui — senão ele inicializa em dobro e duplica TODOS os hits
// (page_view, remarketing, dados do usuário, conversões) no Tag Assistant.
// As conversões disparam normalmente via send_to "AW-730378227/<label>"
// (ver src/lib/analytics/google.ts) — o AW está presente pelo link do GA4.
const GA_ID = "G-NW70BBHDMF";

// Carrega depois da página (afterInteractive — recomendado p/ tag managers) e
// SÓ em produção (build da Vercel); no dev local não roda, pra não poluir dados.
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

import Script from "next/script";

// ID público do projeto no Microsoft Clarity (aparece no bundle do cliente —
// não é segredo).
const CLARITY_ID = "x1zfwe3wbn";

// Microsoft Clarity — mapa de calor + gravações de sessão.
// Carrega depois da página (afterInteractive) e SÓ em produção/staging
// (build da Vercel). No dev local não roda, pra não poluir os dados.
export default function Clarity() {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
    </Script>
  );
}

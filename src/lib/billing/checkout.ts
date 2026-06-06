// Links de checkout da Kiwify (públicos). Configuráveis por env — preencha
// com o link de cada oferta na Kiwify (e na Vercel, em produção).
export const CHECKOUT = {
  individual: {
    monthly: process.env.NEXT_PUBLIC_KIWIFY_INDIVIDUAL_MONTHLY || "",
    annual: process.env.NEXT_PUBLIC_KIWIFY_INDIVIDUAL_ANNUAL || "",
  },
  time: {
    monthly: process.env.NEXT_PUBLIC_KIWIFY_TIME_MONTHLY || "",
    annual: process.env.NEXT_PUBLIC_KIWIFY_TIME_ANNUAL || "",
  },
};

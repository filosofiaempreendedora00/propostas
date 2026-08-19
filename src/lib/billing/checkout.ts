// Links de checkout da Kiwify (públicos). A env da Vercel sobrescreve; os
// defaults abaixo são as ofertas atuais (R$37/R$297 · R$97/R$897) — assim o
// checkout funciona no deploy mesmo antes de setar as envs. IMPORTANTE: o preço
// mostrado em PlansChooser TEM que bater com o que cada link cobra.
export const CHECKOUT = {
  individual: {
    monthly:
      process.env.NEXT_PUBLIC_KIWIFY_INDIVIDUAL_MONTHLY ||
      "https://pay.kiwify.com.br/uuZ8y2I",
    annual:
      process.env.NEXT_PUBLIC_KIWIFY_INDIVIDUAL_ANNUAL ||
      "https://pay.kiwify.com.br/vaYLMVx",
  },
  time: {
    monthly:
      process.env.NEXT_PUBLIC_KIWIFY_TIME_MONTHLY ||
      "https://pay.kiwify.com.br/mtHrzfO",
    annual:
      process.env.NEXT_PUBLIC_KIWIFY_TIME_ANNUAL ||
      "https://pay.kiwify.com.br/ePbRkPy",
  },
};

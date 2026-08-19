// Links de checkout da Kiwify (públicos). HARDCODED direto — de propósito NÃO
// lê env: a Vercel tinha NEXT_PUBLIC_KIWIFY_* ANTIGAS setadas, e env var
// SOBRESCREVE default de código, então o botão abria a oferta velha (R$480 etc.).
// Fixando aqui, as ofertas NOVAS (R$37/R$297 · R$97/R$897) sempre ganham, sem
// depender de limpar a Vercel. Pra trocar no futuro: editar aqui (ou limpar as
// envs na Vercel e voltar a ler process.env). O preço em PlansChooser TEM que
// bater com o que cada link cobra.
export const CHECKOUT = {
  individual: {
    monthly: "https://pay.kiwify.com.br/uuZ8y2I",
    annual: "https://pay.kiwify.com.br/RKehqQY",
  },
  time: {
    monthly: "https://pay.kiwify.com.br/mtHrzfO",
    annual: "https://pay.kiwify.com.br/ePbRkPy",
  },
};

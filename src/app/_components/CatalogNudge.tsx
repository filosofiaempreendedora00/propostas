import Link from "next/link";

// Faixa de ATIVAÇÃO: segue a pessoa por toda a ferramenta enquanto ela ainda não
// tem catálogo real. Sem catálogo não há proposta — é o passo obrigatório e o
// maior gargalo. Some sozinha quando o catálogo é criado. Não é dispensável de
// propósito: o objetivo é levar a pessoa até a tela do catálogo.
export default function CatalogNudge() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 bg-accent px-4 py-2.5 text-center text-[#1c130a]">
      <span className="text-[13.5px] font-medium leading-snug">
        <strong className="font-bold">Comece pelo passo 1:</strong> monte seu
        catálogo — a IA escreve tudo em ~1 min (ou preencha à mão).
      </span>
      <Link
        href="/empresa?tab=solucoes"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#241812] px-4 py-1.5 text-[13px] font-bold text-[#f6efe3] shadow-sm transition hover:bg-[#33241a]"
      >
        Montar meu catálogo
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

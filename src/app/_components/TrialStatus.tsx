"use client";

import { useEffect, useState } from "react";

// Texto + badge da top-bar de teste. Começa com o valor do servidor e atualiza
// na hora (sem reload) quando o Gerador dispara "kronos:usage" após um download.
// Quando a cota acaba, MUDA a mensagem (de "está em teste" → "teste acabou").
export default function TrialStatus({
  initialRemaining,
  limit,
}: {
  initialRemaining: number;
  limit: number;
}) {
  const [remaining, setRemaining] = useState(initialRemaining);

  // Sincroniza se o servidor reenviar (reload/navegação que re-renderize).
  useEffect(() => setRemaining(initialRemaining), [initialRemaining]);

  // Atualização ao vivo vinda do download.
  useEffect(() => {
    const onUsage = (e: Event) => {
      const detail = (e as CustomEvent<{ remaining?: number }>).detail;
      if (detail && typeof detail.remaining === "number") {
        setRemaining(detail.remaining);
      }
    };
    window.addEventListener("kronos:usage", onUsage);
    return () => window.removeEventListener("kronos:usage", onUsage);
  }, []);

  const over = remaining <= 0;

  return (
    <>
      <span className="text-sm font-medium sm:text-[15px]">
        {over ? "Seu teste gratuito acabou" : "Você está em um teste gratuito"}
      </span>
      <span className="rounded-full bg-white/15 px-3 py-0.5 text-[13px] font-semibold tabular-nums">
        {over
          ? "Grátis esgotado"
          : `${remaining} de ${limit} ${remaining === 1 ? "proposta" : "propostas"} grátis`}
      </span>
    </>
  );
}

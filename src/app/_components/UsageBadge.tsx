"use client";

import { useEffect, useState } from "react";

// Badge da cota grátis na top-bar. Começa com o valor do servidor e atualiza
// na hora (sem reload) quando o Gerador dispara "kronos:usage" após um download.
export default function UsageBadge({
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

  const label =
    remaining <= 0
      ? "Grátis esgotado"
      : `${remaining} de ${limit} ${remaining === 1 ? "proposta" : "propostas"} grátis`;

  return (
    <span className="rounded-full bg-white/15 px-3 py-0.5 text-[13px] font-semibold tabular-nums">
      {label}
    </span>
  );
}

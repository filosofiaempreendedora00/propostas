"use client";

import { useEffect, useState } from "react";

// Troca mensagens de carregamento a cada alguns segundos, com fade suave —
// mantém a pessoa entretida enquanto a IA trabalha (em vez de um "carregando…").
export default function CyclingText({
  messages,
  intervalMs = 2400,
  className = "",
}: {
  messages: readonly string[];
  intervalMs?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(
      () => setI((p) => (p + 1) % messages.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [messages.length, intervalMs]);

  // key={i} força o remount → o fade (.cyc-fade) roda a cada troca.
  return (
    <span key={i} className={`cyc-fade inline-block ${className}`}>
      {messages[i]}
    </span>
  );
}

// Loader da identidade Kronos — uma ampulheta que vira (a areia "cai") em loop.
// Use onde algo está realmente carregando, pra dar previsibilidade ao usuário.
export default function KronosLoader({
  label = "Carregando…",
  className = "",
}: {
  label?: string | null;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <svg
        viewBox="0 0 24 24"
        className="kronos-hourglass h-9 w-9 text-accent"
        aria-hidden
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3h12M6 21h12" />
          <path d="M6 3c0 5 6 6 6 9s-6 4-6 9" />
          <path d="M18 3c0 5-6 6-6 9s6 4 6 9" />
        </g>
        {/* areia (triângulos simétricos → o giro de 180° faz loop sem "pulo") */}
        <path d="M8.5 5.5h7L12 10.5Z" fill="currentColor" opacity="0.85" />
        <path d="M8.5 18.5h7L12 13.5Z" fill="currentColor" opacity="0.85" />
      </svg>
      {label && <span className="text-sm text-ink-mute">{label}</span>}
    </div>
  );
}

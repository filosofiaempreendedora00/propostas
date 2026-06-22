// Loader da identidade Kronos — ampulheta que VIRA continuamente (sem pausa):
// a areia "passa" de cima pra baixo a cada giro. Sempre em movimento.
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
        className="kronos-hourglass h-10 w-10 text-accent"
        aria-hidden
      >
        {/* moldura da ampulheta */}
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3h12M6 21h12" />
          <path d="M7 3c0 4.6 5 5.4 5 9s-5 4.4-5 9" />
          <path d="M17 3c0 4.6-5 5.4-5 9s5 4.4 5 9" />
        </g>
        {/* areia simétrica (180° = mesmo visual → o giro contínuo faz loop limpo
            e a areia parece "escorrer" de uma câmara pra outra) */}
        <path d="M8.5 5.5h7L12 10.5Z" fill="currentColor" opacity="0.85" />
        <path d="M8.5 18.5h7L12 13.5Z" fill="currentColor" opacity="0.85" />
      </svg>
      {label && <span className="text-sm text-ink-mute">{label}</span>}
    </div>
  );
}

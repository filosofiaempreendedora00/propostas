"use client";

// Componentes de formulário compartilhados entre os ambientes.

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">
      {children}
    </span>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-mute focus:border-accent/60"
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-y rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm leading-relaxed text-ink outline-none transition placeholder:text-ink-mute focus:border-accent/60"
    />
  );
}

/** Editor de lista "um item por linha". */
export function LineList({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <TextArea
      value={value.join("\n")}
      onChange={(raw) => onChange(raw.split("\n").map((s) => s).filter((s) => s.trim() !== ""))}
      rows={rows}
      placeholder={placeholder}
    />
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 mt-9 border-b border-line pb-2 text-sm font-semibold uppercase tracking-[0.16em] text-accent first:mt-0">
      {children}
    </h2>
  );
}

export function MiniBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
        danger
          ? "border-line text-ink-mute hover:border-red-500/50 hover:text-red-400"
          : "border-line text-ink-soft hover:border-accent/60 hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}

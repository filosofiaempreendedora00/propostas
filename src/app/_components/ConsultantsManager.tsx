"use client";

import { useConsultants } from "@/lib/catalog/store";
import { useCompany } from "@/lib/company/store";
import { CONSULTANT_TERMS, termPlural } from "@/lib/company/terms";
import { Label, TextInput, MiniBtn } from "./fields";

export default function ConsultantsManager() {
  const { items, ready, add, update, remove } = useConsultants();
  const { consultantTerm, setTerm } = useCompany();

  const term = consultantTerm;
  const termLow = term.toLowerCase();
  const plural = termPlural(term);

  return (
    <div className="form-scroll h-full overflow-y-auto">
      <div className="max-w-5xl px-10 py-9">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
              {plural}
            </h1>
            <p className="mt-1.5 text-sm text-ink-mute">
              Cadastre quem assina as propostas. Serão puxados no fechamento.
            </p>
          </div>
          <button
            onClick={add}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90"
          >
            + Novo
          </button>
        </div>

        {/* Seletor do termo — separado dos cards */}
        <div className="mb-7 rounded-xl border border-line bg-panel/40 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label>Como sua empresa chama esse papel?</Label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="rounded-lg border border-field-line bg-field px-3 py-2 text-sm font-medium text-field-ink outline-none transition focus:border-accent"
            >
              {CONSULTANT_TERMS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.value}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-mute">
            O termo escolhido vira o <strong className="text-ink-soft">padrão no Gerador</strong>{" "}
            quando a proposta for gerada (ex.: a seção vira “Recomendação do{" "}
            {termLow}”).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((c) => (
            <div key={c.id} className="rounded-xl border border-line bg-panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-panel-2 text-sm font-semibold text-accent">
                  {(c.name || "?").trim().charAt(0).toUpperCase()}
                </span>
                <MiniBtn danger onClick={() => remove(c.id)}>
                  excluir
                </MiniBtn>
              </div>
              <label className="block">
                <Label>Nome do {termLow}</Label>
                <TextInput
                  value={c.name}
                  onChange={(v) => update(c.id, { name: v })}
                  placeholder="Nome completo"
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label>
                  <Label>E-mail</Label>
                  <TextInput
                    value={c.email}
                    onChange={(v) => update(c.id, { email: v })}
                    placeholder="email@empresa.com"
                  />
                </label>
                <label>
                  <Label>Telefone</Label>
                  <TextInput
                    value={c.phone}
                    onChange={(v) => update(c.id, { phone: v })}
                    placeholder="(00) 00000-0000"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        {ready && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-mute">
            Nenhum {termLow} cadastrado.
          </div>
        )}

        <p className="mt-4 text-xs text-ink-mute">
          ✓ Alterações salvas automaticamente.
        </p>
      </div>
    </div>
  );
}

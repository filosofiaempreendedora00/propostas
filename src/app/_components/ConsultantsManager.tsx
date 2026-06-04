"use client";

import { useConsultants } from "@/lib/catalog/store";
import { ROLE_OPTIONS } from "@/lib/company/terms";
import { Label, TextInput, MiniBtn } from "./fields";

export default function ConsultantsManager() {
  const { items, ready, add, update, remove } = useConsultants();

  return (
    <div className="form-scroll h-full overflow-y-auto">
      <div className="px-10 py-9">
        <div className="mb-7 flex items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
              Consultores
            </h1>
            <p className="mt-1.5 text-sm text-ink-mute">
              Quem assina as propostas — cada um com seu cargo. O cargo escolhido
              vai direto pra proposta quando essa pessoa for a responsável.
            </p>
          </div>
          <button
            onClick={add}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90"
          >
            + Novo
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                <Label>Nome</Label>
                <TextInput
                  value={c.name}
                  onChange={(v) => update(c.id, { name: v })}
                  placeholder="Nome completo"
                />
              </label>

              <div className="mt-3 block">
                <Label>Cargo</Label>
                <select
                  value={c.role}
                  onChange={(e) => update(c.id, { role: e.target.value })}
                  className="w-full rounded-lg border border-field-line bg-field px-3 py-2 text-sm font-medium text-field-ink outline-none transition focus:border-accent"
                >
                  {/* mantém valores customizados que não estejam na lista */}
                  {!ROLE_OPTIONS.includes(c.role) && c.role && (
                    <option value={c.role}>{c.role}</option>
                  )}
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

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
            Nenhum consultor cadastrado.
          </div>
        )}

        <p className="mt-4 text-xs text-ink-mute">
          ✓ Alterações salvas automaticamente.
        </p>
      </div>
    </div>
  );
}

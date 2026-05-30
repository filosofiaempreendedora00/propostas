"use client";

import { useConsultants } from "@/lib/catalog/store";
import { Label, TextInput, MiniBtn } from "./fields";

export default function ConsultantsManager() {
  const { items, ready, add, update, remove } = useConsultants();

  return (
    <div className="form-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Consultores</div>
            <div className="text-[11px] text-ink-mute">
              Cadastre quem assina as propostas. Eles serão puxados no fechamento.
            </div>
          </div>
          <button
            onClick={add}
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-bg transition hover:opacity-90"
          >
            + Novo
          </button>
        </div>

        <div className="space-y-3">
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

          {ready && items.length === 0 && (
            <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-mute">
              Nenhum consultor cadastrado.
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-ink-mute">
          ✓ Alterações salvas automaticamente neste navegador.
        </p>
      </div>
    </div>
  );
}

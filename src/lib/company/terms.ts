// Termo do papel comercial (escolhido na aba Consultores; reflete no Gerador).
// Módulo PURO (client + server).

export const CONSULTANT_TERMS: { value: string; plural: string }[] = [
  { value: "Consultor", plural: "Consultores" },
  { value: "Especialista", plural: "Especialistas" },
  { value: "Vendedor", plural: "Vendedores" },
  { value: "Comercial", plural: "Comerciais" },
  { value: "Representante", plural: "Representantes" },
  { value: "Gerente de contas", plural: "Gerentes de contas" },
];

export const DEFAULT_CONSULTANT_TERM = "Consultor";

export function termPlural(term: string): string {
  return (
    CONSULTANT_TERMS.find((t) => t.value === term)?.plural ?? `${term}s`
  );
}

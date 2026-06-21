// Constantes e tipos das sugestões. Fica FORA do arquivo "use server"
// (que só pode exportar funções async).

export const SUGGESTION_STATUSES = [
  "new",
  "reviewing",
  "planned",
  "done",
  "declined",
] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export const SUGGESTION_CATEGORIES = [
  "ideia",
  "melhoria",
  "problema",
  "outro",
] as const;
export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export type MySuggestion = {
  id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  createdAt: string | null;
};

export type AdminSuggestion = MySuggestion & {
  authorEmail: string | null;
  orgName: string | null;
  adminNote: string;
};

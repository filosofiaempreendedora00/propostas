-- Coluna para registrar o 1º download de cada conta (evento de conversão
-- BaixouPrimeiraProposta, disparado uma única vez). Idempotente e aditivo.

alter table public.organizations
  add column if not exists first_download_at timestamptz;

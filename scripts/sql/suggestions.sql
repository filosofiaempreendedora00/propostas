-- Cria a tabela de sugestões + RLS. Idempotente (seguro re-executar).
-- Aplicar no Supabase (SQL editor) ou via DIRECT_URL.

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  user_id uuid,
  author_email text,
  title text not null,
  body text not null default '',
  category text not null default 'melhoria',
  status text not null default 'new',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $do$ begin
  if not exists (select 1 from pg_constraint where conname='suggestions_org_id_organizations_id_fk') then
    alter table public.suggestions add constraint suggestions_org_id_organizations_id_fk
      foreign key (org_id) references public.organizations(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname='suggestions_user_fk') then
    alter table public.suggestions add constraint suggestions_user_fk
      foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $do$;

-- RLS: autor vê/cria as suas; triagem é via servidor (conexão direta, fora do RLS).
alter table public.suggestions enable row level security;
drop policy if exists sug_insert on public.suggestions;
create policy sug_insert on public.suggestions for insert with check (user_id = auth.uid());
drop policy if exists sug_select_own on public.suggestions;
create policy sug_select_own on public.suggestions for select using (user_id = auth.uid());

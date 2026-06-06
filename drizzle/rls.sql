-- Políticas de segurança (RLS) do multi-tenant — idempotente, re-executável.
-- Já aplicado no Supabase. Mantido versionado para reproduzir num deploy novo.
-- (A criação da org e o backfill de dados são operações pontuais, fora daqui.)

-- Função helper: orgs do usuário logado. SECURITY DEFINER evita recursão de RLS
-- ao consultar memberships dentro das próprias políticas.
create or replace function public.user_org_ids()
returns setof uuid language sql security definer set search_path = public stable as $fn$
  select org_id from public.memberships where user_id = auth.uid();
$fn$;

-- FKs para auth.users (integridade + cascade ao deletar usuário)
do $do$ begin
  if not exists (select 1 from pg_constraint where conname='organizations_owner_fk') then
    alter table public.organizations add constraint organizations_owner_fk
      foreign key (owner_id) references auth.users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='memberships_user_fk') then
    alter table public.memberships add constraint memberships_user_fk
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $do$;

-- Ativa RLS
alter table public.organizations   enable row level security;
alter table public.memberships     enable row level security;
alter table public.invitations     enable row level security;
alter table public.solutions       enable row level security;
alter table public.solution_plans  enable row level security;
alter table public.consultants     enable row level security;
alter table public.block_templates enable row level security;
alter table public.company_settings enable row level security;

-- Organizações: vê as suas; dono pode editar
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select using (id in (select public.user_org_ids()));
drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations for update using (owner_id = auth.uid());

-- Membros / convites: visíveis para membros da org
drop policy if exists mem_select on public.memberships;
create policy mem_select on public.memberships for select using (org_id in (select public.user_org_ids()));
drop policy if exists inv_select on public.invitations;
create policy inv_select on public.invitations for select using (org_id in (select public.user_org_ids()));

-- Tabelas de dados: CRUD restrito à org do usuário
drop policy if exists sol_all on public.solutions;
create policy sol_all on public.solutions for all
  using (org_id in (select public.user_org_ids())) with check (org_id in (select public.user_org_ids()));
drop policy if exists plan_all on public.solution_plans;
create policy plan_all on public.solution_plans for all
  using (org_id in (select public.user_org_ids())) with check (org_id in (select public.user_org_ids()));
drop policy if exists cons_all on public.consultants;
create policy cons_all on public.consultants for all
  using (org_id in (select public.user_org_ids())) with check (org_id in (select public.user_org_ids()));
drop policy if exists tpl_all on public.block_templates;
create policy tpl_all on public.block_templates for all
  using (org_id in (select public.user_org_ids())) with check (org_id in (select public.user_org_ids()));
drop policy if exists comp_all on public.company_settings;
create policy comp_all on public.company_settings for all
  using (org_id in (select public.user_org_ids())) with check (org_id in (select public.user_org_ids()));

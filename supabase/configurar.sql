-- =====================================================================
-- Rifa da Formatura · banco de dados do painel da Geo
--
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Rode DEPOIS de criar o seu usuário em Authentication > Users:
-- o último passo transforma esse usuário na dona do painel.
-- Pode rodar de novo sem medo: nada é apagado.
-- =====================================================================

-- 1) Quem pode entrar no painel ---------------------------------------
create table if not exists public.admins (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.admins enable row level security;
-- Sem regras de acesso: ninguém lê nem muda esta tabela pela internet.
revoke all on public.admins from anon, authenticated;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
revoke all on function public.eh_admin() from public, anon;
grant execute on function public.eh_admin() to authenticated;

-- 2) Configuração da página (preço, Pix, WhatsApp, textos) -------------
create table if not exists public.config (
  id            int primary key default 1 check (id = 1),
  dados         jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
alter table public.config enable row level security;
revoke all on public.config from anon;
grant select, insert, update on public.config to authenticated;

drop policy if exists "dona le config" on public.config;
create policy "dona le config" on public.config
  for select to authenticated using (public.eh_admin());
drop policy if exists "dona cria config" on public.config;
create policy "dona cria config" on public.config
  for insert to authenticated with check (public.eh_admin());
drop policy if exists "dona altera config" on public.config;
create policy "dona altera config" on public.config
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

create or replace function public.config_carimbo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;
drop trigger if exists config_carimbo on public.config;
create trigger config_carimbo before update on public.config
  for each row execute function public.config_carimbo();

-- 3) Vendas (nomes e telefones dos compradores: só a dona vê) ----------
create table if not exists public.vendas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null default '',
  telefone      text not null default '',
  numeros       int[] not null default '{}',
  pago          boolean not null default false,
  bilhete       boolean not null default false,
  obs           text not null default '',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  pago_em       timestamptz
);
alter table public.vendas enable row level security;
revoke all on public.vendas from anon;
grant select, insert, update, delete on public.vendas to authenticated;

drop policy if exists "dona ve vendas" on public.vendas;
create policy "dona ve vendas" on public.vendas
  for select to authenticated using (public.eh_admin());
drop policy if exists "dona cria vendas" on public.vendas;
create policy "dona cria vendas" on public.vendas
  for insert to authenticated with check (public.eh_admin());
drop policy if exists "dona altera vendas" on public.vendas;
create policy "dona altera vendas" on public.vendas
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
drop policy if exists "dona apaga vendas" on public.vendas;
create policy "dona apaga vendas" on public.vendas
  for delete to authenticated using (public.eh_admin());

-- Um número nunca fica em duas vendas ao mesmo tempo
create or replace function public.vendas_checar_numeros()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(2026202);
  new.numeros := coalesce((select array_agg(distinct n order by n) from unnest(new.numeros) as n), '{}');
  if exists (
    select 1 from public.vendas v
    where v.id <> new.id and v.numeros && new.numeros
  ) then
    raise exception 'numero_ocupado';
  end if;
  return new;
end;
$$;
drop trigger if exists vendas_checar_numeros on public.vendas;
create trigger vendas_checar_numeros before insert or update of numeros on public.vendas
  for each row execute function public.vendas_checar_numeros();

-- Guarda a hora da última mudança (a página mostra "Atualizado em ...")
create or replace function public.vendas_marcar_mudanca()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.config set atualizado_em = now() where id = 1;
  return null;
end;
$$;
drop trigger if exists vendas_marcar_mudanca on public.vendas;
create trigger vendas_marcar_mudanca after insert or update or delete on public.vendas
  for each statement execute function public.vendas_marcar_mudanca();

-- 4) O que a página pública pode ver ----------------------------------
-- Só a configuração e a lista de números ocupados. Nada de nomes ou telefones.
create or replace function public.estado_publico()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'v', 1,
    'cfg', (select c.dados from public.config c where c.id = 1),
    'ocupados', coalesce((
      select jsonb_agg(s.n order by s.n)
      from (select distinct unnest(v.numeros) as n from public.vendas v) s
    ), '[]'::jsonb),
    'atualizado', (select c.atualizado_em from public.config c where c.id = 1)
  );
$$;
revoke all on function public.estado_publico() from public;
grant execute on function public.estado_publico() to anon, authenticated;

-- 5) Painel atualiza sozinho quando uma venda muda ---------------------
do $$
begin
  alter publication supabase_realtime add table public.vendas;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

-- 6) Você vira a dona do painel ----------------------------------------
-- Marca como dona quem já tem usuário criado (só você, se criou antes de rodar isto).
insert into public.admins (user_id)
select id from auth.users
on conflict do nothing;

-- Confira: a lista abaixo tem que mostrar o SEU e-mail.
select u.email as "Quem pode entrar no painel"
from public.admins a
join auth.users u on u.id = a.user_id;

-- =====================================================================
-- Rifa da Formatura · liberação automática das reservas não pagas
--
-- Depois do prazo de reserva (Ajustes > Prazo pra pagar uma reserva),
-- uma venda que não foi marcada como paga:
--   1. some na hora da lista de números ocupados da página pública;
--   2. é liberada pelo banco a cada 10 minutos: os números saem da venda
--      e ficam guardados em "numeros_liberados" (a venda não é apagada).
-- Se a pessoa pagar atrasado, o painel devolve os números pra ela.
-- Pode rodar de novo sem medo: nada é apagado.
-- =====================================================================

alter table public.vendas add column if not exists liberada_em timestamptz;
alter table public.vendas add column if not exists numeros_liberados int[] not null default '{}';
alter table public.vendas add column if not exists sem_prazo boolean not null default false;

-- Prazo de reserva configurado no painel (em horas; 24 se não houver)
create or replace function public.prazo_reserva()
returns interval
language sql
stable
security definer
set search_path = ''
as $$
  select make_interval(hours => greatest(1, coalesce((
    select case when (c.dados->>'prazoReserva') ~ '^[0-9]+$' then (c.dados->>'prazoReserva')::int end
    from public.config c where c.id = 1
  ), 24)));
$$;
revoke all on function public.prazo_reserva() from public, anon;
grant execute on function public.prazo_reserva() to authenticated;

-- Libera as reservas vencidas (menos a venda "poupar", se for informada)
create or replace function public.liberar_vencidas(poupar uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not exists (
    select 1 from public.vendas v
     where not v.pago
       and v.liberada_em is null
       and cardinality(v.numeros) > 0
       and not v.sem_prazo
       and v.criado_em + public.prazo_reserva() < now()
       and (poupar is null or v.id <> poupar)
  ) then
    return 0;
  end if;
  update public.vendas v
     set numeros_liberados = v.numeros,
         numeros = '{}',
         liberada_em = now(),
         atualizado_em = now()
   where not v.pago
     and v.liberada_em is null
     and cardinality(v.numeros) > 0
     and not v.sem_prazo
     and v.criado_em + public.prazo_reserva() < now()
     and (poupar is null or v.id <> poupar);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.liberar_vencidas(uuid) from public, anon;
grant execute on function public.liberar_vencidas(uuid) to authenticated;

-- Ao registrar números, reservas vencidas que estavam com eles são liberadas antes
create or replace function public.vendas_checar_numeros()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(2026202);
  new.numeros := coalesce((select array_agg(distinct n order by n) from unnest(new.numeros) as n), '{}');
  if cardinality(new.numeros) > 0 then
    if pg_trigger_depth() = 1 then
      perform public.liberar_vencidas(new.id);
    end if;
    if exists (
      select 1 from public.vendas v
      where v.id <> new.id and v.numeros && new.numeros
    ) then
      raise exception 'numero_ocupado';
    end if;
    -- a venda voltou a ter números: deixa de estar liberada
    new.liberada_em := null;
    new.numeros_liberados := '{}';
  end if;
  return new;
end;
$$;

-- Página pública: reserva vencida e não paga já não conta como ocupada
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
      from (
        select distinct unnest(v.numeros) as n
        from public.vendas v
        where v.pago or v.sem_prazo or v.criado_em + public.prazo_reserva() >= now()
      ) s
    ), '[]'::jsonb),
    'atualizado', (select c.atualizado_em from public.config c where c.id = 1)
  );
$$;
revoke all on function public.estado_publico() from public;
grant execute on function public.estado_publico() to anon, authenticated;

-- Liberação automática a cada 10 minutos (Supabase Cron)
create extension if not exists pg_cron;
select cron.schedule(
  'liberar-reservas-vencidas',
  '*/10 * * * *',
  $$ select public.liberar_vencidas(); $$
);

-- Confira: deve aparecer o job "liberar-reservas-vencidas"
select jobname as "Rotina", schedule as "Quando", active as "Ligada"
from cron.job
where jobname = 'liberar-reservas-vencidas';

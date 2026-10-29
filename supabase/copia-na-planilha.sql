-- =====================================================================
-- Rifa da Formatura · cópia automática das vendas numa planilha do Google
--
-- A cada mudança nas vendas (e também de hora em hora), o banco manda a
-- lista completa pra um Apps Script ligado à planilha da Geo, que reescreve
-- as abas "Vendas", "Números" e "Resumo".
-- O endereço do Apps Script e a senha ficam na tabela "integracoes", que
-- ninguém consegue ler pela internet (só pelo painel do Supabase).
-- Pode rodar de novo sem medo: nada é apagado.
-- =====================================================================

create extension if not exists pg_net;

create table if not exists public.integracoes (
  nome          text primary key,
  url           text not null,
  segredo       text not null,
  atualizado_em timestamptz not null default now()
);
alter table public.integracoes enable row level security;
revoke all on public.integracoes from anon, authenticated;

-- Manda a lista completa de vendas pra planilha
create or replace function public.enviar_planilha()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  i record;
  corpo jsonb;
begin
  select * into i from public.integracoes where nome = 'planilha';
  if not found then
    return null;
  end if;
  corpo := jsonb_build_object(
    'segredo', i.segredo,
    'preco', (select c.dados->'preco' from public.config c where c.id = 1),
    'prazo_horas', (select c.dados->'prazoReserva' from public.config c where c.id = 1),
    'universo', to_jsonb(public.numeros_da_rifa()),
    'vendas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'codigo', v.codigo, 'nome', v.nome, 'telefone', v.telefone,
        'numeros', to_jsonb(v.numeros), 'liberados', to_jsonb(v.numeros_liberados),
        'pago', v.pago, 'bilhete', v.bilhete, 'obs', v.obs,
        'criado', v.criado_em, 'pago_em', v.pago_em, 'liberada', v.liberada_em, 'origem', v.origem,
        'origem_txt', case v.origem when 'site' then 'Site' when 'presencial' then 'Presencial' else 'Painel' end,
        'situacao', case
          when v.pago then 'Pago'
          when cardinality(v.numeros) = 0 and v.liberada_em is not null then 'Liberada (não pagou no prazo)'
          when v.sem_prazo then 'Reservado (paga depois)'
          when v.criado_em + public.prazo_reserva() < now() then 'Reserva vencida'
          else 'Aguardando pagamento'
        end
      ) order by v.criado_em)
      from public.vendas v
    ), '[]'::jsonb)
  );
  return net.http_post(
    url := i.url,
    body := corpo,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 20000
  );
end;
$$;
revoke all on function public.enviar_planilha() from public, anon, authenticated;

create or replace function public.vendas_para_planilha()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enviar_planilha();
  return null;
end;
$$;
drop trigger if exists vendas_para_planilha on public.vendas;
create trigger vendas_para_planilha after insert or update or delete on public.vendas
  for each statement execute function public.vendas_para_planilha();

-- Garantia: manda tudo de novo de hora em hora
select cron.schedule(
  'copia-na-planilha',
  '7 * * * *',
  $$ select public.enviar_planilha(); $$
);

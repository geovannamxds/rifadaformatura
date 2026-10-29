-- Painel avançado (29/10/2026): prazo extra numa reserva, histórico de cada venda,
-- "números garantidos hoje" na página e avisos no celular quando chega pedido ou comprovante.
-- Os segredos dos avisos (chave VAPID privada e endereço da função) ficam só no banco,
-- em privado.segredos, e não neste arquivo.

-- 1) "Dar mais 24h" numa reserva -------------------------------------------------
alter table public.vendas add column if not exists prazo_extra_horas integer not null default 0;
alter table public.vendas drop constraint if exists vendas_prazo_extra_ok;
alter table public.vendas add constraint vendas_prazo_extra_ok check (prazo_extra_horas between 0 and 720);

create or replace function public.vence_em(p_criado timestamptz, p_extra integer)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select p_criado + public.prazo_reserva() + make_interval(hours => coalesce(p_extra, 0));
$$;
revoke all on function public.vence_em(timestamptz, integer) from public, anon, authenticated;

-- o prazo de cada venda passa a contar as horas extras em todas as funções
do $$
declare f record; d text;
begin
  for f in
    select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('liberar_vencidas', 'situacao_pedidos', 'pedidos_do_whatsapp', 'enviar_planilha')
  loop
    d := pg_get_functiondef(f.oid);
    if position('v.criado_em + public.prazo_reserva()' in d) > 0 then
      execute replace(d, 'v.criado_em + public.prazo_reserva()', 'public.vence_em(v.criado_em, v.prazo_extra_horas)');
    end if;
  end loop;
end;
$$;

-- 2) Página: números ocupados + "garantidos hoje" ---------------------------------
create or replace function public.estado_publico()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with vivas as (
    select v.numeros, v.pago, v.criado_em
      from public.vendas v
     where cardinality(v.numeros) > 0
       and (v.pago or v.sem_prazo or v.comprovante_em is not null
            or public.vence_em(v.criado_em, v.prazo_extra_horas) >= now())
  )
  select jsonb_build_object(
    'v', 1,
    'cfg', (select c.dados from public.config c where c.id = 1),
    'ocupados', coalesce((select jsonb_agg(s.n order by s.n) from (select distinct unnest(x.numeros) as n from vivas x) s), '[]'::jsonb),
    'reservados', coalesce((select jsonb_agg(s.n order by s.n) from (select distinct unnest(x.numeros) as n from vivas x where not x.pago) s), '[]'::jsonb),
    'hoje', (select coalesce(sum(cardinality(x.numeros)), 0) from vivas x
              where x.criado_em >= (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')),
    'atualizado', (select c.atualizado_em from public.config c where c.id = 1)
  );
$$;
revoke all on function public.estado_publico() from public;
grant execute on function public.estado_publico() to anon, authenticated;

-- 3) Histórico de cada venda ------------------------------------------------------
create table if not exists public.vendas_historico (
  id bigint generated always as identity primary key,
  venda_id uuid not null,
  quando timestamptz not null default now(),
  evento text not null,
  detalhe text not null default '',
  quem text not null default ''
);
create index if not exists vendas_historico_venda on public.vendas_historico (venda_id, quando);
alter table public.vendas_historico enable row level security;
drop policy if exists "dona ve historico" on public.vendas_historico;
create policy "dona ve historico" on public.vendas_historico for select to authenticated using (public.eh_admin());

create or replace function public.vendas_registrar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quem text := case coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '')
                 when 'authenticated' then 'painel' when 'anon' then 'pagina' else 'automatico' end;
begin
  if tg_op = 'INSERT' then
    insert into public.vendas_historico (venda_id, evento, detalhe, quem)
    values (new.id, case when new.origem = 'site' then 'pedido' else 'venda' end, array_to_string(new.numeros, ', '), quem);
    if new.pago then
      insert into public.vendas_historico (venda_id, evento, quem) values (new.id, 'pago', quem);
    end if;
    return null;
  end if;
  if tg_op = 'DELETE' then
    insert into public.vendas_historico (venda_id, evento, detalhe, quem)
    values (old.id, 'excluida', array_to_string(old.numeros || old.numeros_liberados, ', '), quem);
    return null;
  end if;
  if new.comprovante_em is not null and new.comprovante_em is distinct from old.comprovante_em then
    insert into public.vendas_historico (venda_id, evento, quem) values (new.id, 'comprovante', quem);
  end if;
  if new.pago and not old.pago then
    insert into public.vendas_historico (venda_id, evento, quem) values (new.id, 'pago', quem);
  elsif old.pago and not new.pago then
    insert into public.vendas_historico (venda_id, evento, quem) values (new.id, 'pago_desfeito', quem);
  end if;
  if new.bilhete and not old.bilhete then
    insert into public.vendas_historico (venda_id, evento, quem) values (new.id, 'bilhete', quem);
  elsif old.bilhete and not new.bilhete then
    insert into public.vendas_historico (venda_id, evento, quem) values (new.id, 'bilhete_desfeito', quem);
  end if;
  if cardinality(new.numeros) = 0 and new.liberada_em is not null and old.liberada_em is null then
    insert into public.vendas_historico (venda_id, evento, detalhe, quem)
    values (new.id, 'liberada', array_to_string(old.numeros, ', '), 'automatico');
  elsif old.liberada_em is not null and cardinality(old.numeros) = 0 and cardinality(new.numeros) > 0 then
    insert into public.vendas_historico (venda_id, evento, detalhe, quem)
    values (new.id, 'devolvida', array_to_string(new.numeros, ', '), quem);
  elsif new.numeros is distinct from old.numeros and cardinality(new.numeros) > 0 then
    insert into public.vendas_historico (venda_id, evento, detalhe, quem)
    values (new.id, 'numeros', array_to_string(new.numeros, ', '), quem);
  end if;
  if new.prazo_extra_horas > old.prazo_extra_horas then
    insert into public.vendas_historico (venda_id, evento, detalhe, quem)
    values (new.id, 'prazo_extra', (new.prazo_extra_horas - old.prazo_extra_horas)::text, quem);
  end if;
  if new.sem_prazo <> old.sem_prazo then
    insert into public.vendas_historico (venda_id, evento, quem)
    values (new.id, case when new.sem_prazo then 'sem_prazo' else 'com_prazo' end, quem);
  end if;
  return null;
end;
$$;
revoke all on function public.vendas_registrar() from public, anon, authenticated;
drop trigger if exists vendas_registrar on public.vendas;
create trigger vendas_registrar after insert or update or delete on public.vendas
for each row execute function public.vendas_registrar();

-- o histórico das vendas que já existiam, montado com as datas que o banco já tinha
do $$
begin
  if not exists (select 1 from public.vendas_historico) then
    insert into public.vendas_historico (venda_id, quando, evento, detalhe, quem)
    select v.id, v.criado_em, case when v.origem = 'site' then 'pedido' else 'venda' end,
           array_to_string(case when cardinality(v.numeros) > 0 then v.numeros else v.numeros_liberados end, ', '),
           case when v.origem = 'site' then 'pagina' else 'painel' end
      from public.vendas v;
    insert into public.vendas_historico (venda_id, quando, evento, quem)
    select v.id, v.comprovante_em, 'comprovante', 'pagina' from public.vendas v where v.comprovante_em is not null;
    insert into public.vendas_historico (venda_id, quando, evento, quem)
    select v.id, v.pago_em, 'pago', 'painel' from public.vendas v where v.pago and v.pago_em is not null;
    insert into public.vendas_historico (venda_id, quando, evento, detalhe, quem)
    select v.id, v.liberada_em, 'liberada', array_to_string(v.numeros_liberados, ', '), 'automatico'
      from public.vendas v where v.liberada_em is not null;
  end if;
end;
$$;

-- 4) Avisos no celular ------------------------------------------------------------
create table if not exists public.avisos_inscricoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  aparelho text not null default '',
  criado_em timestamptz not null default now()
);
alter table public.avisos_inscricoes enable row level security;
drop policy if exists "dona ve inscricoes" on public.avisos_inscricoes;
drop policy if exists "dona cria inscricoes" on public.avisos_inscricoes;
drop policy if exists "dona altera inscricoes" on public.avisos_inscricoes;
drop policy if exists "dona apaga inscricoes" on public.avisos_inscricoes;
create policy "dona ve inscricoes" on public.avisos_inscricoes for select to authenticated using (public.eh_admin());
create policy "dona cria inscricoes" on public.avisos_inscricoes for insert to authenticated with check (public.eh_admin());
create policy "dona altera inscricoes" on public.avisos_inscricoes for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "dona apaga inscricoes" on public.avisos_inscricoes for delete to authenticated using (public.eh_admin());

create table if not exists public.avisos_fila (
  id bigint generated always as identity primary key,
  titulo text not null,
  corpo text not null default '',
  url text not null default '',
  tag text not null default '',
  criado_em timestamptz not null default now(),
  pego_em timestamptz,
  resultado jsonb
);
alter table public.avisos_fila enable row level security;
drop policy if exists "dona ve avisos" on public.avisos_fila;
create policy "dona ve avisos" on public.avisos_fila for select to authenticated using (public.eh_admin());

create or replace function public.brl(p numeric)
returns text
language sql
immutable
set search_path = ''
as $$ select 'R$ ' || replace(to_char(coalesce(p, 0), 'FM999999990.00'), '.', ','); $$;

-- põe um aviso na fila e chama a função que manda pro celular
create or replace function public.avisar(p_titulo text, p_corpo text, p_url text default '', p_tag text default '')
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare v_id bigint; v_url text;
begin
  if not exists (select 1 from public.avisos_inscricoes) then
    return null;
  end if;
  insert into public.avisos_fila (titulo, corpo, url, tag)
  values (left(p_titulo, 120), left(coalesce(p_corpo, ''), 300), coalesce(p_url, ''), left(regexp_replace(coalesce(p_tag, ''), '[^A-Za-z0-9_-]', '', 'g'), 32))
  returning id into v_id;
  select s.valor into v_url from privado.segredos s where s.nome = 'avisos_url';
  if v_url is not null then
    perform net.http_post(url := v_url, body := '{}'::jsonb,
      headers := jsonb_build_object('Content-Type', 'application/json'), timeout_milliseconds := 20000);
  end if;
  return v_id;
end;
$$;
revoke all on function public.avisar(text, text, text, text) from public, anon, authenticated;

-- a função de avisos (com a chave de serviço) pega os avisos da fila
create or replace function public.pegar_avisos()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v jsonb;
begin
  with pegos as (
    update public.avisos_fila f
       set pego_em = now()
     where f.id in (select a.id from public.avisos_fila a
                     where a.pego_em is null and a.criado_em > now() - interval '2 hours'
                     order by a.id limit 20 for update skip locked)
    returning f.id, f.titulo, f.corpo, f.url, f.tag
  )
  select jsonb_build_object(
    'avisos', coalesce((select jsonb_agg(to_jsonb(p) order by p.id) from pegos p), '[]'::jsonb),
    'inscricoes', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'endpoint', i.endpoint,
                     'keys', jsonb_build_object('p256dh', i.p256dh, 'auth', i.auth))) from public.avisos_inscricoes i), '[]'::jsonb),
    'vapid', (select s.valor from privado.segredos s where s.nome = 'vapid_privada'),
    'contato', 'https://geovannamxds.github.io/rifadaformatura/'
  ) into v;
  return v;
end;
$$;
revoke all on function public.pegar_avisos() from public, anon, authenticated;
grant execute on function public.pegar_avisos() to service_role;

create or replace function public.registrar_avisos(p_resultados jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.avisos_fila f
     set resultado = (select jsonb_agg(r) from jsonb_array_elements(p_resultados) r where (r->>'aviso')::bigint = f.id)
   where f.id in (select distinct (r->>'aviso')::bigint from jsonb_array_elements(p_resultados) r);
  -- aparelho que saiu ou desinstalou o app: tira da lista
  delete from public.avisos_inscricoes i
   where i.id in (select (r->>'inscricao')::uuid from jsonb_array_elements(p_resultados) r
                   where (r->>'status')::int in (404, 410));
  delete from public.avisos_fila where criado_em < now() - interval '30 days';
end;
$$;
revoke all on function public.registrar_avisos(jsonb) from public, anon, authenticated;
grant execute on function public.registrar_avisos(jsonb) to service_role;

-- pedido novo pelo site e comprovante anexado viram aviso no celular
create or replace function public.vendas_avisar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_preco numeric; v_nome text; v_n int;
begin
  begin
    v_preco := coalesce((select (c.dados->>'preco')::numeric from public.config c where c.id = 1), 5);
    v_nome := coalesce(nullif(split_part(btrim(new.nome), ' ', 1), ''), 'Alguém');
    if tg_op = 'INSERT' then
      if new.origem = 'site' and cardinality(new.numeros) > 0 then
        v_n := cardinality(new.numeros);
        perform public.avisar('🛒 Novo pedido ' || coalesce(new.codigo, ''),
          v_nome || ' reservou ' || v_n || case when v_n = 1 then ' número' else ' números' end || ' · ' || public.brl(v_n * v_preco),
          '?venda=' || new.id, 'pedido-' || coalesce(new.codigo, ''));
      end if;
    elsif new.comprovante_em is not null and new.comprovante_em is distinct from old.comprovante_em and not new.pago then
      v_n := greatest(cardinality(new.numeros), cardinality(new.numeros_liberados));
      perform public.avisar('📎 Comprovante pra conferir',
        v_nome || ' · pedido ' || coalesce(new.codigo, '') || ' · ' || public.brl(v_n * v_preco)
          || case when cardinality(new.numeros) = 0 then ' (chegou depois do prazo)' else '' end,
        '?venda=' || new.id, 'comp-' || coalesce(new.codigo, ''));
    end if;
  exception when others then
    null; -- aviso nunca atrapalha uma venda
  end;
  return null;
end;
$$;
revoke all on function public.vendas_avisar() from public, anon, authenticated;
drop trigger if exists vendas_avisar on public.vendas;
create trigger vendas_avisar after insert or update of comprovante_em on public.vendas
for each row execute function public.vendas_avisar();

-- botão "Mandar aviso de teste" do painel
create or replace function public.testar_aviso()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'sem_acesso';
  end if;
  return public.avisar('🔔 Avisos ligados!', 'É assim que vão chegar os pedidos e os comprovantes da rifa.', '', 'teste');
end;
$$;
revoke all on function public.testar_aviso() from public, anon;
grant execute on function public.testar_aviso() to authenticated;

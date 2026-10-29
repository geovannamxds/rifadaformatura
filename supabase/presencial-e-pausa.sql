-- =====================================================================
-- Rifa da Formatura · venda presencial sem prazo e pausa das vendas
--
-- 1. Vendas registradas no painel podem ficar "sem prazo" (a pessoa paga
--    depois, combinado com a Geo): essas reservas nunca são liberadas sozinhas.
-- 2. Com as vendas pausadas no painel, a página não aceita pedidos novos.
-- 3. A planilha recebe a situação e a origem de cada venda já prontas.
-- Pode rodar de novo sem medo: nada é apagado.
-- =====================================================================

alter table public.vendas add column if not exists sem_prazo boolean not null default false;

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

-- Pedido feito pelo comprador
create or replace function public.reservar(p_nome text, p_telefone text, p_numeros int[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  cfg jsonb;
  v_nome text;
  v_tel text;
  v_nums int[];
  v_ocupados int[];
  v_ip text;
  v_codigo text;
  v_letras constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_n int;
  i int;
begin
  select c.dados into cfg from public.config c where c.id = 1;
  if cfg is null or coalesce(cfg->>'pronto', 'false') <> 'true' then
    raise exception 'vendas_fechadas';
  end if;
  if coalesce(cfg->>'pausado', 'false') = 'true' then
    raise exception 'vendas_pausadas';
  end if;
  if coalesce(cfg->>'fimVendas', '') ~ '^\d{4}-\d{2}-\d{2}$'
     and now() >= (((cfg->>'fimVendas')::date + 1)::timestamp at time zone 'America/Sao_Paulo') then
    raise exception 'vendas_fechadas';
  end if;

  v_nome := left(btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g')), 80);
  if char_length(v_nome) < 2 then
    raise exception 'nome_invalido';
  end if;
  v_tel := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  if v_tel ~ '^55\d{10,11}$' then
    v_tel := substr(v_tel, 3);
  end if;
  if v_tel !~ '^\d{10,11}$' then
    raise exception 'telefone_invalido';
  end if;

  v_nums := coalesce((select array_agg(distinct n order by n) from unnest(p_numeros) as n where n is not null), '{}');
  if cardinality(v_nums) = 0 then
    raise exception 'sem_numeros';
  end if;
  if cardinality(v_nums) > 20 then
    raise exception 'muitos_numeros';
  end if;
  if not (v_nums <@ public.numeros_da_rifa()) then
    raise exception 'numero_fora';
  end if;

  perform pg_advisory_xact_lock(2026202);
  perform public.liberar_vencidas();

  -- limites contra reservas de brincadeira
  select count(*) into v_n
    from public.vendas v
   where v.telefone = v_tel and not v.pago and cardinality(v.numeros) > 0;
  if v_n >= 2 then
    raise exception 'limite_whatsapp';
  end if;
  begin
    v_ip := btrim(split_part(coalesce(
      current_setting('request.headers', true)::json->>'cf-connecting-ip',
      current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1));
  exception when others then
    v_ip := '';
  end;
  if v_ip <> '' then
    v_ip := encode(sha256(convert_to('rifa-geo:' || v_ip, 'UTF8')), 'hex');
    select count(*) into v_n
      from public.vendas v
     where v.origem_ip = v_ip and not v.pago and cardinality(v.numeros) > 0;
    if v_n >= 4 then
      raise exception 'limite_conexao';
    end if;
  else
    v_ip := null;
  end if;
  select count(*) into v_n
    from public.vendas v
   where v.origem = 'site' and v.criado_em > now() - interval '1 hour';
  if v_n >= 30 then
    raise exception 'muitos_pedidos';
  end if;

  select array_agg(s.n order by s.n) into v_ocupados
    from (select unnest(v.numeros) as n from public.vendas v) s
   where s.n = any (v_nums);
  if v_ocupados is not null then
    raise exception 'numero_ocupado:%', array_to_string(v_ocupados, ',');
  end if;

  loop
    v_codigo := '';
    for i in 1..4 loop
      v_codigo := v_codigo || substr(v_letras, 1 + floor(random() * length(v_letras))::int, 1);
    end loop;
    exit when not exists (select 1 from public.vendas v where v.codigo = v_codigo);
  end loop;

  insert into public.vendas (codigo, origem, origem_ip, nome, telefone, numeros)
  values (v_codigo, 'site', v_ip, v_nome, v_tel, v_nums);

  return jsonb_build_object(
    'codigo', v_codigo,
    'numeros', to_jsonb(v_nums),
    'prazo', now() + public.prazo_reserva()
  );
end;
$$;
revoke all on function public.reservar(text, text, int[]) from public;
grant execute on function public.reservar(text, text, int[]) to anon, authenticated;

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

-- Confira
select count(*) filter (where column_name = 'sem_prazo') as "coluna sem_prazo",
       (select count(*) from pg_proc where proname = 'reservar') as "função reservar"
from information_schema.columns where table_schema = 'public' and table_name = 'vendas';

-- =====================================================================
-- Rifa da Formatura · pedido feito pelo próprio comprador na página
--
-- O comprador escolhe os números, informa nome e WhatsApp e toca em
-- "Gerar Pix e reservar": a função reservar() separa os números na hora,
-- com o mesmo prazo de reserva do painel, e devolve o código do pedido.
-- Proteções: até 20 números por pedido, no máximo 2 pedidos sem pagamento
-- por WhatsApp, 4 por conexão e 30 pedidos do site por hora no total.
-- Rode depois de configurar.sql e liberar-reservas.sql.
-- Pode rodar de novo sem medo: nada é apagado.
-- =====================================================================

alter table public.vendas add column if not exists codigo text;
alter table public.vendas add column if not exists origem text not null default 'painel';
alter table public.vendas add column if not exists origem_ip text;
create unique index if not exists vendas_codigo_unico on public.vendas (codigo) where codigo is not null;

-- Os números da rifa, a partir das faixas configuradas no painel (ex.: 19201-19300, 19351-19500)
create or replace function public.numeros_da_rifa()
returns int[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  faixas text;
  parte text;
  m text[];
  a int;
  b int;
  t int;
  res int[] := '{}';
begin
  select c.dados->>'faixas' into faixas from public.config c where c.id = 1;
  if faixas is null then
    return res;
  end if;
  foreach parte in array regexp_split_to_array(faixas, '[,;\n]+') loop
    parte := btrim(parte);
    m := regexp_match(parte, '^(\d{3,7})\s*(?:-|–|—|a|até)\s*(\d{3,7})$', 'i');
    if m is null then
      m := regexp_match(parte, '^(\d{3,7})$');
      if m is not null then
        m := array[m[1], m[1]];
      end if;
    end if;
    if m is not null then
      a := m[1]::int;
      b := m[2]::int;
      if a > b then t := a; a := b; b := t; end if;
      if b - a <= 4999 then
        res := res || array(select generate_series(a, b));
      end if;
    end if;
  end loop;
  return res;
end;
$$;
revoke all on function public.numeros_da_rifa() from public, anon;
grant execute on function public.numeros_da_rifa() to authenticated;

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

-- Confira: deve aparecer "reservar"
select p.proname as "Função criada"
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'reservar';

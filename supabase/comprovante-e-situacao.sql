-- =====================================================================
-- Rifa da Formatura · comprovante pelo site, situação do pedido e "reservado"
--
-- 1) O comprador anexa o comprovante do Pix na própria página. Só entra
--    foto (JPEG, PNG, WebP) ou PDF, conferido pelo conteúdo do arquivo e
--    não pelo nome. O arquivo fica guardado no banco e só a dona vê.
-- 2) Pedido com comprovante não vence sozinho: espera a dona conferir.
-- 3) O comprador vê a situação real do pedido (aguardando, comprovante
--    enviado, pago), informando o código e o WhatsApp do pedido.
-- 4) A página mostra separado o que está reservado e o que já foi pago.
--
-- Rode depois de presencial-e-pausa.sql. Pode rodar de novo sem medo:
-- nada é apagado.
-- =====================================================================

alter table public.vendas add column if not exists comprovante_em timestamptz;

-- Comprovantes enviados pela página ------------------------------------
create table if not exists public.comprovantes (
  id         uuid primary key default gen_random_uuid(),
  venda_id   uuid not null references public.vendas (id) on delete cascade,
  tipo       text not null check (tipo in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  arquivo    bytea not null,
  tamanho    int not null,
  enviado_em timestamptz not null default now()
);
create index if not exists comprovantes_por_venda on public.comprovantes (venda_id, enviado_em desc);
alter table public.comprovantes enable row level security;
revoke all on public.comprovantes from anon, authenticated;
grant select, delete on public.comprovantes to authenticated;
drop policy if exists "dona ve comprovantes" on public.comprovantes;
create policy "dona ve comprovantes" on public.comprovantes
  for select to authenticated using (public.eh_admin());
drop policy if exists "dona apaga comprovantes" on public.comprovantes;
create policy "dona apaga comprovantes" on public.comprovantes
  for delete to authenticated using (public.eh_admin());

-- Telefone no mesmo formato que reservar() grava -------------------------
create or replace function public.telefone_normal(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d ~ '^55\d{10,11}$' then substr(d, 3)
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x;
$$;

-- O comprador manda o comprovante do pedido -----------------------------
create or replace function public.enviar_comprovante(p_codigo text, p_telefone text, p_tipo text, p_arquivo text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_venda public.vendas%rowtype;
  v_bytes bytea;
  v_n int;
  v_ok boolean;
begin
  select * into v_venda
    from public.vendas v
   where v.codigo = upper(btrim(coalesce(p_codigo, '')))
     and v.telefone = public.telefone_normal(p_telefone)
     and v.origem = 'site';
  if not found then
    raise exception 'pedido_nao_encontrado';
  end if;
  if v_venda.pago then
    return jsonb_build_object('situacao', 'pago');
  end if;
  if p_tipo is null or p_tipo not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') then
    raise exception 'arquivo_invalido';
  end if;
  if length(coalesce(p_arquivo, '')) > 4500000 then
    raise exception 'arquivo_grande';
  end if;
  begin
    v_bytes := decode(p_arquivo, 'base64');
  exception when others then
    raise exception 'arquivo_invalido';
  end;
  if octet_length(v_bytes) < 2000 then
    raise exception 'arquivo_invalido';
  end if;
  -- o tipo é conferido pelos primeiros bytes do arquivo
  v_ok := case p_tipo
    when 'image/jpeg' then substring(v_bytes from 1 for 3) = '\xffd8ff'::bytea
    when 'image/png' then substring(v_bytes from 1 for 8) = '\x89504e470d0a1a0a'::bytea
    when 'image/webp' then substring(v_bytes from 1 for 4) = '\x52494646'::bytea and substring(v_bytes from 9 for 4) = '\x57454250'::bytea
    when 'application/pdf' then substring(v_bytes from 1 for 5) = '\x255044462d'::bytea
    else false
  end;
  if not v_ok then
    raise exception 'arquivo_invalido';
  end if;
  select count(*) into v_n from public.comprovantes c where c.venda_id = v_venda.id;
  if v_n >= 5 then
    raise exception 'muitos_comprovantes';
  end if;

  insert into public.comprovantes (venda_id, tipo, arquivo, tamanho)
  values (v_venda.id, p_tipo, v_bytes, octet_length(v_bytes));
  update public.vendas v
     set comprovante_em = now(),
         atualizado_em = now()
   where v.id = v_venda.id;
  return jsonb_build_object('situacao', 'comprovante', 'comprovante_em', now());
end;
$$;
revoke all on function public.enviar_comprovante(text, text, text, text) from public;
grant execute on function public.enviar_comprovante(text, text, text, text) to anon, authenticated;

-- Situação dos pedidos deste aparelho (código + WhatsApp de cada um) -------
create or replace function public.situacao_pedidos(p_pedidos jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'codigo', v.codigo,
    'numeros', to_jsonb(v.numeros),
    'liberados', to_jsonb(v.numeros_liberados),
    'situacao', case
      when v.pago then 'pago'
      when cardinality(v.numeros) = 0 and v.liberada_em is not null
           and (v.comprovante_em is null or v.liberada_em > v.comprovante_em) then 'liberado'
      when v.comprovante_em is not null then 'comprovante'
      when cardinality(v.numeros) = 0 then 'liberado'
      else 'aguardando'
    end,
    'prazo', case when v.pago or v.sem_prazo or v.comprovante_em is not null then null
                  else v.criado_em + public.prazo_reserva() end,
    'criado', v.criado_em,
    'pago_em', v.pago_em,
    'comprovante_em', v.comprovante_em,
    'bilhete', v.bilhete
  ) order by v.criado_em), '[]'::jsonb)
  from (
    select e.item
      from jsonb_array_elements(case when jsonb_typeof(p_pedidos) = 'array' then p_pedidos else '[]'::jsonb end)
           with ordinality as e(item, i)
     where e.i <= 12
  ) x
  join public.vendas v
    on v.codigo = upper(btrim(coalesce(x.item->>'codigo', '')))
   and v.telefone = public.telefone_normal(x.item->>'fone')
   and v.origem = 'site';
$$;
revoke all on function public.situacao_pedidos(jsonb) from public;
grant execute on function public.situacao_pedidos(jsonb) to anon, authenticated;

-- Pedido com comprovante espera a dona: não é liberado sozinho ------------
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
       and v.comprovante_em is null
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
     and v.comprovante_em is null
     and v.criado_em + public.prazo_reserva() < now()
     and (poupar is null or v.id <> poupar);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Página pública: ocupados (todos) e, dentro deles, os só reservados -------
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
        where v.pago or v.sem_prazo or v.comprovante_em is not null
           or v.criado_em + public.prazo_reserva() >= now()
      ) s
    ), '[]'::jsonb),
    'reservados', coalesce((
      select jsonb_agg(s.n order by s.n)
      from (
        select distinct unnest(v.numeros) as n
        from public.vendas v
        where not v.pago
          and (v.sem_prazo or v.comprovante_em is not null
               or v.criado_em + public.prazo_reserva() >= now())
      ) s
    ), '[]'::jsonb),
    'atualizado', (select c.atualizado_em from public.config c where c.id = 1)
  );
$$;
revoke all on function public.estado_publico() from public;
grant execute on function public.estado_publico() to anon, authenticated;

-- Planilha: nova situação "Comprovante enviado (conferir)" -----------------
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
          when v.comprovante_em is not null then 'Comprovante enviado (conferir)'
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

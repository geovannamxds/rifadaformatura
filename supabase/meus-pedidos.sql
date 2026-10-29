-- =====================================================================
-- Rifa da Formatura · "Meus pedidos" em outro aparelho
--
-- O comprador informa o WhatsApp e o código de UM dos pedidos dele; se os
-- dois baterem, a página recebe todos os pedidos feitos pelo site com esse
-- WhatsApp (só o primeiro nome, os números e a situação de cada um).
-- Rode depois de comprovante-e-situacao.sql. Pode rodar de novo sem medo.
-- =====================================================================

create or replace function public.pedidos_do_whatsapp(p_telefone text, p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'codigo', v.codigo,
    'nome', split_part(btrim(v.nome), ' ', 1),
    'fone', v.telefone,
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
  from public.vendas v
  where v.origem = 'site'
    and v.codigo is not null
    and v.telefone = public.telefone_normal(p_telefone)
    and length(public.telefone_normal(p_telefone)) between 10 and 11
    and exists (
      select 1 from public.vendas c
       where c.origem = 'site'
         and c.codigo = upper(btrim(coalesce(p_codigo, '')))
         and c.telefone = public.telefone_normal(p_telefone)
    );
$$;
revoke all on function public.pedidos_do_whatsapp(text, text) from public;
grant execute on function public.pedidos_do_whatsapp(text, text) to anon, authenticated;

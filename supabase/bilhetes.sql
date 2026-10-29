-- =====================================================================
-- Rifa da Formatura · chave das fotos dos bilhetes
--
-- As fotos dos bilhetes ficam no site, na pasta bilhetes/, cifradas
-- (AES-256-GCM): quem baixar um arquivo de lá não consegue ver a imagem.
-- A chave que abre as fotos fica guardada aqui, num esquema que a API não
-- enxerga, e só quem está na tabela admins (a dona da rifa, logada no
-- painel) consegue pedir a chave pela função chave_bilhetes().
--
-- Troque __CHAVE__ pela chave antes de rodar (ela não fica no GitHub).
-- Pode rodar de novo sem medo: só atualiza a chave.
-- Rode depois de configurar.sql.
-- =====================================================================

create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

create table if not exists privado.segredos (
  nome  text primary key,
  valor text not null
);
alter table privado.segredos enable row level security;
revoke all on privado.segredos from public, anon, authenticated;

insert into privado.segredos (nome, valor) values ('chave_bilhetes', '__CHAVE__')
on conflict (nome) do update set valor = excluded.valor;

create or replace function public.chave_bilhetes()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.valor
    from privado.segredos s
   where s.nome = 'chave_bilhetes'
     and public.eh_admin();
$$;

revoke all on function public.chave_bilhetes() from public, anon;
grant execute on function public.chave_bilhetes() to authenticated;

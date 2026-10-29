-- Atualização automática dos números (já aplicado no banco em 29/10/2026)
-- A liberação das reservas vencidas passa a rodar a cada 1 minuto (antes, a cada 10).
-- Quando não há nada vencido, a rotina só confere e sai, sem mexer em nada.
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'liberar-reservas-vencidas'),
  schedule := '* * * * *'
);

-- Limpa o histórico das rotinas (fica só a última semana), pra não encher o banco.
select cron.schedule(
  'limpar-historico-rotinas',
  '17 4 * * *',
  $$ delete from cron.job_run_details where end_time < now() - interval '7 days' $$
);

-- Confira: as três rotinas ligadas
select jobname as "Rotina", schedule as "Quando", active as "Ligada" from cron.job order by jobname;

-- Funções de gatilho não podem ser chamadas pela internet (só rodam sozinhas, quando uma venda muda)
revoke execute on function public.vendas_para_planilha() from public, anon, authenticated;
revoke execute on function public.vendas_marcar_mudanca() from public, anon, authenticated;
revoke execute on function public.vendas_checar_numeros() from public, anon, authenticated;
revoke execute on function public.config_carimbo() from public, anon, authenticated;

# Rifa da Formatura da Geo — instruções pro Claude Code

Site de vendas dos 250 números da **Rifa Formô 26.2** da Geo, com painel da vendedora.
A Geo conversa em português do Brasil e prefere textos com a voz dela: informais, em primeira pessoa e sem cara de IA
("pra", "tá", emojis com moderação). Todo texto do site segue esse tom.

## Como o site funciona

- **Hospedagem:** GitHub Pages, branch `main`. Cada push publica sozinho.
  - Página: https://geovannamxds.github.io/rifadaformatura/ (link divulgado: https://tinyurl.com/rifadageo)
  - Painel: `/admin` · Login: `/login`
- **Banco:** Supabase, projeto `muteohdvmlznfxcvhbjy`. A chave publicável fica em `config.js` (é pública por natureza).
- **Um programa só:** `app.js` + `app.css` servem a página pública **e** o painel. O `<body data-pagina="publico|admin">` decide o modo.
  - A página pública **não** carrega `vendor/supabase.js`: ela fala com o banco por `fetch` nas funções RPC.
  - O painel e o login usam `vendor/supabase.js`.
- **Não existe mais build.** O antigo `build.py`/`fonte.html`/`extra*.js` se perdeu. Edite `app.js` e `app.css` direto.
- **Depois de mudar `app.js` ou `app.css`, atualize o `?v=`** nos três HTML. Sem isso, o navegador dos compradores continua com a versão velha:
  ```bash
  J=$(md5sum app.js | cut -c1-8); C=$(md5sum app.css | cut -c1-8)
  sed -i "s/app\.js?v=[0-9a-f]*/app.js?v=$J/; s/app\.css?v=[0-9a-f]*/app.css?v=$C/" index.html admin/index.html login/index.html
  ```
- **Imagens:**
  - `img/p1-v2.webp` … `p5-v2.webp`: prêmios recortados com fundo transparente. Ficam direto no vidro de cada card do carrossel.
  - `og-3.jpg`: banner da prévia do WhatsApp. Mantenha abaixo de ~300 KB, senão o WhatsApp não mostra.
  - Se trocar uma imagem, troque também o nome do arquivo, pra não pegar a versão guardada no navegador.
- **Bilhetes:** `bilhetes/N.bin` são as fotos dos bilhetes cifradas (AES-256-GCM, IV de 12 bytes + dados, AAD = número). A chave fica só no banco (`privado.segredos`, nome `chave_bilhetes`), e o painel pega pela RPC `chave_bilhetes()`.
- **Avisos no celular:**
  - Quando entra um pedido pelo site ou um comprovante, um gatilho põe o aviso em `avisos_fila` e chama a função `supabase/functions/avisar` (via `pg_net`).
  - A função manda o Web Push pra cada aparelho em `avisos_inscricoes`. Quem recebe é `admin/sw.js`.
  - Ficam só no banco, em `privado.segredos`: a chave VAPID privada (`vapid_privada`) e o endereço da função (`avisos_url`).
  - A chave pública está em `app.js` (`VAPID_PUBLICA`).
  - **Não mande o cabeçalho `Topic`:** a Apple recusa (`BadWebPushTopic`).
- **Links do WhatsApp:** use sempre `https://api.whatsapp.com/send?phone=…&text=…`. O `wa.me` estraga os emojis.

## Regras da rifa (já estão no banco e no site)

- **Números e preço:**
  - Blocos 19201–19300 e 19351–19500, a R$ 5 cada.
  - Até 40 números por pedido e até 2 pedidos esperando confirmação por WhatsApp.
- **Reserva:** dura 24 h (`cfg.prazoReserva`), mais as horas extras da venda (`prazo_extra_horas`, botão "Dar mais 24h").
- **Comprovante:** quando é anexado, a reserva para de vencer, e a Geo confere e marca como pago.
- **Liberação:** a rotina `liberar-reservas-vencidas` roda a cada minuto. A venda não é apagada: os números vão pra `numeros_liberados`.
- **Venda presencial:** pode ser "sem prazo" (`sem_prazo`).
- **Datas:**
  - Fim das vendas: 15/03/2027.
  - Conferência da Formô: 16 a 22/03/2027.
  - Sorteio: 23/03/2027, ao vivo no @formobrasil.pr.

## Banco (Supabase)

- **Tabelas:**
  - `vendas`, `comprovantes` (bytea), `config` (`dados` jsonb).
  - `vendas_historico` (preenchida por gatilho), `avisos_inscricoes`, `avisos_fila`.
  - `admins`, `integracoes` (planilha do Google) e `privado.segredos`.
- **RLS:** só a dona (`eh_admin()`) lê ou muda as vendas.
- **RPCs que a página pública pode chamar (anon):** `estado_publico`, `reservar`, `enviar_comprovante`, `situacao_pedidos`, `pedidos_do_whatsapp`.
- **Rotinas (pg_cron):**
  - `liberar-reservas-vencidas`: a cada minuto.
  - `copia-na-planilha`: de hora em hora, no minuto 7. A planilha também recebe uma cópia a cada mudança.
  - `limpar-historico-rotinas`: uma vez por dia.
- **Arquivos:** cada mudança no banco tem um `.sql` em `supabase/`. O mais recente é `painel-avancado.sql`.
- **Prazo de uma venda:** use sempre `public.vence_em(criado_em, prazo_extra_horas)`.

## Cuidados (importante)

- **Nunca** coloque no repositório:
  - a chave dos bilhetes;
  - a chave VAPID privada;
  - o segredo da planilha;
  - nome ou telefone de comprador.
- **As vendas da Geo são reais.** Nunca altere ou apague uma venda dela.
  - Teste no banco de verdade só dentro de um bloco `do $$ … raise exception 'RESULTADO …' $$`, que desfaz tudo no final.
  - Se o teste precisar gravar, use o nome `TESTE (Claude)` e apague depois.
- **Mudanças no banco:**
  - Peça autorização da Geo antes de aplicar.
  - Prefira `apply_migration`.
  - Depois, confira se `estado_publico()` continua igual pros números que já existiam.
- **Bonequinho com a foto da Geo:**
  - O código existe, mas está desligado (`MOSTRAR_BONECO = false`).
  - A imagem não está no repositório.
  - **Não publique** sem a Geo pedir: ela ainda não aprovou.

## Como testar

- **Servir o site:** `python3 -m http.server 8765` na pasta do repositório.
- **Testar com Playwright:**
  - Intercepte `*.supabase.co` com respostas de mentira pras RPCs.
  - Bloqueie `fonts.googleapis.com`.
- **Abrir o painel no teste:**
  - Ponha uma sessão falsa em `localStorage['sb-muteohdvmlznfxcvhbjy-auth-token']`.
  - Responda de mentira `/auth/v1/user`, `rpc/eh_admin`, `/rest/v1/config` e `/rest/v1/vendas?…`.
  - Cuidado com a ordem das rotas: `vendas_historico` também começa com `vendas`.
- **O que conferir:**
  - celular (390 px e 320 px), computador e tema escuro;
  - que a página não role pros lados;
  - que não apareça erro no console.

## Depois de subir

- **Confira se o GitHub Pages terminou:**
  ```bash
  env -u GH_TOKEN gh run list --repo geovannamxds/rifadaformatura --limit 1
  ```
  Espere `completed success` com o SHA do seu commit.
- **Se falhar com `id-token`:** use "Re-run failed jobs" no Actions.
- **Commits:** mensagens em português, curtas, dizendo o que mudou pra quem compra ou pro painel.

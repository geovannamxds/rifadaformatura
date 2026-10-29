# Rifa da Formatura da Geo

Página de vendas dos números da Rifa Formô 26.2, com painel de controle protegido por login.

- Página dos compradores: https://geovannamxds.github.io/rifadaformatura/
- Login do painel: https://geovannamxds.github.io/rifadaformatura/login
- Painel: https://geovannamxds.github.io/rifadaformatura/admin

## Como funciona

- `index.html`, `app.js`, `app.css`: a página pública e o painel usam o mesmo programa.
- `login/` e `login.js`: entrada do painel com e-mail e senha (Supabase Auth).
- `admin/`: o painel da vendedora (vendas, números, mensagens, ajustes, planilha .csv).
- `config.js`: endereço do projeto no Supabase e a chave publicável. Essas duas informações são públicas por natureza.
- `supabase/configurar.sql`: cria as tabelas e as regras de segurança no Supabase (rode primeiro).
- `supabase/liberar-reservas.sql`: libera sozinho, a cada 10 minutos, as reservas que passaram do prazo sem pagamento (rode depois). A venda não é apagada: os números ficam guardados pra devolver se a pessoa pagar atrasado.
- `supabase/pedidos-pelo-site.sql`: o comprador faz o pedido na página (nome, WhatsApp, números) e os números ficam reservados na hora, com limites contra reservas de brincadeira.
- `supabase/presencial-e-pausa.sql`: venda presencial "sem prazo" (não é liberada sozinha) e pausa das vendas pelo painel.
- `supabase/copia-na-planilha.sql` e `supabase/planilha-apps-script.gs`: cópia automática das vendas numa planilha do Google da Geo (o endereço e a senha da planilha ficam só no banco, na tabela `integracoes`).
- `supabase/comprovante-e-situacao.sql`: o comprador anexa o comprovante na página (só foto ou PDF, conferido pelo conteúdo do arquivo; só a dona vê), pedido com comprovante não vence sozinho, o comprador vê a situação real do pedido e a página mostra "Reservado" separado de "Vendido". A página percebe sozinha se esse arquivo já rodou: antes disso, continua com o comprovante pelo WhatsApp.
- `supabase/meus-pedidos.sql`: "Meus pedidos" em outro aparelho: com o WhatsApp e o código de um pedido, a página mostra todos os pedidos daquele WhatsApp (só primeiro nome, números e situação).
- `bilhetes/` e `supabase/bilhetes.sql`: fotos dos bilhetes de cada número, cifradas (AES-256-GCM). Quem baixar um arquivo daqui não consegue ver a imagem: a chave fica só no banco (`privado.segredos`) e só a dona logada no painel recebe, pela função `chave_bilhetes()`. O botão "Mandar bilhete no WhatsApp" do painel usa essas fotos.
- `painel.webmanifest` e `img/icone-*.png`: o painel pode ser instalado como aplicativo no celular.
- `estado.json`: cópia de reserva da configuração, usada se o banco de dados não responder.
- `.github/workflows/manter-ativo.yml`: consulta o banco a cada 2 dias pra o projeto gratuito não ser pausado.

## Segurança

Os nomes e telefones dos compradores ficam só no banco de dados do Supabase, protegidos por regras de acesso (RLS):
só o usuário marcado como dona (tabela `admins`) consegue ler ou mudar as vendas. A página pública recebe apenas a
configuração e a lista de números ocupados, pela função `estado_publico()`. Nenhum dado de comprador fica neste repositório.

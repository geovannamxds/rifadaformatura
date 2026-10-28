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
- `supabase/configurar.sql`: cria as tabelas e as regras de segurança no Supabase.
- `estado.json`: cópia de reserva da configuração, usada se o banco de dados não responder.
- `.github/workflows/manter-ativo.yml`: consulta o banco a cada 2 dias pra o projeto gratuito não ser pausado.

## Segurança

Os nomes e telefones dos compradores ficam só no banco de dados do Supabase, protegidos por regras de acesso (RLS):
só o usuário marcado como dona (tabela `admins`) consegue ler ou mudar as vendas. A página pública recebe apenas a
configuração e a lista de números ocupados, pela função `estado_publico()`. Nenhum dado de comprador fica neste repositório.

# PlataformaSimulado (ANACfly)

Plataforma de simulados para as provas teóricas ANAC (Piloto Privado e Piloto
Comercial), com conta de usuário, histórico de simulados, um instrutor de IA
integrado e um plano Premium (R$ 9,99, pagamento único).

> ⚠️ **Modo de teste atual:** contas, sessão, histórico de simulados e status
> Premium ficam salvos **apenas no navegador** (`localStorage`), não em um
> banco de dados de verdade. Isso é temporário — o backend com Postgres
> (Supabase) continua no projeto, pronto para ser reconectado (ver a seção
> [Modo de teste (localStorage) vs. banco de dados](#modo-de-teste-localstorage-vs-banco-de-dados)).

## Estrutura do projeto

```
.
├── index.html          # Frontend (SPA em HTML/CSS/JS puro) — hoje é onde
│                        # ficam as contas, sessão, histórico e Premium (localStorage)
├── api/
│   ├── chat.js           # ATIVO — proxy serverless para a API da Groq (instrutor de IA)
│   ├── register.js       # em standby — POST { name, email, password, course, canac } → cria usuário no Postgres
│   ├── login.js           # em standby — POST { email, password, canac } → autentica e retorna token + histórico
│   ├── me.js               # em standby — GET (Authorization: Bearer <token>) → restaura sessão
│   ├── attempts.js        # em standby — POST (Authorization: Bearer <token>) → salva o resultado de um simulado
│   ├── logout.js          # em standby — POST (Authorization: Bearer <token>) → invalida o token
│   ├── checkout.js        # em standby — cria o pagamento do Premium no PagBank (Checkout)
│   └── premium-webhook.js # em standby — confirma o pagamento aprovado do PagBank
├── db.js                # Cliente Postgres (Supabase) — usado pelas rotas "em standby" acima
├── auth.js               # Helper compartilhado: valida o token de sessão (Bearer)
├── schema.sql             # Tabelas `users`, `sessions`, `attempts`, `premium_payments`
├── scripts/init-db.js     # Script para aplicar o schema.sql no Supabase (rodar uma vez, quando reconectar o banco)
├── package.json
├── vercel.json
├── .env.example
└── .gitignore
```

**"Em standby"** significa: o código continua completo e funcional, só que o
front-end (`index.html`) não está chamando essas rotas agora — ele lê e
escreve direto no `localStorage`. Ver a seção abaixo para saber como voltar
a usá-las.

## Modo de teste (localStorage) vs. banco de dados

Para permitir testar a plataforma inteira sem precisar configurar um banco
de dados agora, todo o "backend de contas" foi temporariamente reimplementado
dentro do próprio `index.html`, usando `localStorage`:

- **Contas**: guardadas em `localStorage["anacfly_local_users_v1"]`, uma por
  e-mail. A senha nunca fica em texto puro — é passada por SHA-256
  (`crypto.subtle`) antes de salvar. Isso **não substitui** um hash forte
  feito no servidor (como o bcrypt que `api/register.js` já usa) — é só o
  suficiente para não deixar a senha visível durante os testes.
- **Sessão**: `localStorage["anacfly_local_session_v1"]` guarda o id do
  usuário logado neste navegador (sem expiração, sem token — é só local).
- **Histórico de simulados**: cada tentativa fica dentro do próprio registro
  do usuário, em `history`.
- **Premium**: o registro do usuário guarda a flag (`isPremium` / `plan`),
  mas quem assina de verdade paga pelo PagBank (`api/checkout.js`) — só a
  confirmação automática de volta pro `localStorage` depois do pagamento
  ainda depende do banco de dados (ver a seção Premium abaixo).

Tudo isso é implementado nas funções `local*` no `index.html`
(`localRegister`, `localLogin`, `localLogout`, `localRestoreSession`,
`localSaveAttempt`, `localSetPlan`, etc.), logo abaixo do comentário
`SISTEMA DE LOGIN + PERFIL DO PILOTO`.

**Quando você conectar um banco de dados de verdade (Supabase):**

1. Configure `DATABASE_URL` nas variáveis de ambiente e rode `npm run init-db`
   (ver `## Banco de dados` abaixo) — as rotas em `api/` já existem e não
   precisam de nenhuma alteração.
2. No `index.html`, troque as chamadas às funções `local*` pelas chamadas
   equivalentes em `/api/...` (o código antigo baseado em
   `apiRequest("/api/login", ...)`, `apiRequest("/api/register", ...)` etc.
   é bem parecido com o que está lá hoje — é basicamente reintroduzir um
   token salvo no `localStorage` em vez de um id de usuário puro).
3. `startPremiumCheckout()` já chama `/api/checkout.js` (PagBank) de
   verdade — falta só religar a confirmação: descomente o trecho marcado em
   `api/premium-webhook.js` para gravar `users.is_premium = true` no banco
   quando o pagamento for aprovado, e troque o retorno de
   `/api/checkout` (`?premium=return`) por uma consulta a `/api/me` para
   atualizar `currentUser.isPremium` no front-end.

Importante: como é tudo local, **os dados não saem deste navegador** — outro
dispositivo, ou o mesmo navegador em modo anônimo, não vê a mesma conta nem
o mesmo histórico. Isso é esperado no modo de teste.

## Banco de dados: Supabase (Postgres) — em standby

- `db.js` usa a biblioteca `postgres` (pacote npm `postgres`, de
  porsager), que expõe a mesma interface de template string (`` sql`...` ``)
  que o projeto já usava — as queries dentro das rotas em `api/` não
  precisaram mudar.
- `schema.sql` define as tabelas `users`, `sessions` (tokens de login, com
  expiração), `attempts` (histórico de simulados) e `premium_payments`
  (auditoria dos pagamentos do Premium).
- Pegue a connection string em Supabase → **Project Settings → Database →
  Connection string**:
  - Para as funções em `api/` no dia a dia (serverless, vida curta), use o
    **Transaction pooler** (Supavisor/PgBouncer, porta `6543`).
  - Para rodar `scripts/init-db.js` (uma vez, localmente), prefira a
    conexão **direta** (porta `5432`) ou o pooler em modo **Session** — DDL
    (`CREATE TABLE`, `ALTER TABLE`) funciona melhor fora do modo
    "Transaction".
  - Formato típico do pooler: `postgresql://postgres.<project-ref>:<senha>@aws-0-<região>.pooler.supabase.com:6543/postgres`
- O schema **não** é aplicado a cada request (isso seria caro em
  serverless). Para religar o banco, rode uma vez, localmente:

  ```bash
  cp .env.example .env        # preencha DATABASE_URL com a connection
                               # string do seu projeto no Supabase
  npm install
  npm run init-db              # cria as tabelas no Supabase
  ```

- Como a conexão é feita direto via Postgres (não pela API REST/PostgREST
  do Supabase), o **Row Level Security (RLS)** das tabelas não entra no
  caminho dessas rotas — elas conectam com as credenciais do Postgres, não
  com uma chave `anon`/`service_role` do Supabase. Se no futuro você também
  quiser expor essas tabelas pela API do Supabase (supabase-js) para o
  próprio navegador, aí sim vale revisar as políticas de RLS antes.

## Planos: ANACfly Free e ANACfly Premium

Assim que a conta é criada, o app mostra uma tela para escolher o plano
(a mesma tela pode ser revisitada depois pelo botão "Escolher plano" no
painel do piloto):

- **ANACfly Free** (R$ 0, para sempre) — inclui:
  - Simulados ilimitados
  - Matérias de estudo completas
  - Vídeo aulas
- **ANACfly Premium** (R$ 9,99, pagamento único) — tudo do Free, mais:
  - Instrutor IA sem restrições (chat ilimitado)
  - Geração ilimitada de questões inéditas com IA
  - Geração ilimitada de flashcards com IA
  - Metas de estudo personalizadas com acompanhamento de progresso
  - Selo Premium dourado no perfil
  - Pagamento único — sem mensalidade, sem renovação automática

O usuário pode continuar no Free e assinar o Premium depois a qualquer
momento pelo aviãozinho ✈ ao lado do perfil, no topo da tela, que abre um
menu retrátil com o status do plano atual. Esse aviãozinho (e a borda do
chip do perfil) ficam dourados quando a conta é Premium, e no tom padrão
quando é Free. As três ferramentas exclusivas do Premium aparecem marcadas
com uma estrelinha dourada discreta no menu lateral e no atalho flutuante
do Instrutor IA (🤖); clicar nelas sem Premium abre esse mesmo menu de
assinatura (ver `PREMIUM_GATED_SCREENS` em `index.html`).

O botão "Assinar" chama de verdade `api/checkout.js`, que cria um
**Checkout PagBank** (página de pagamento hospedada com Pix, cartão e
boleto) e redireciona o comprador para lá — a ativação de teste que só
marcava a flag localmente foi removida.

- `api/checkout.js` cria o Checkout PagBank para o usuário (usando os
  dados `id`/`name`/`email` já disponíveis no `localStorage`, já que ainda
  não há sessão de backend) e devolve o link de pagamento (`payUrl`), para
  o qual o navegador é redirecionado.
- `api/premium-webhook.js` recebe as notificações do PagBank quando o
  pagamento é aprovado. **Antes de usar em produção**, implemente a
  confirmação de autenticidade da notificação (assinatura SHA-256) descrita
  em
  https://developer.pagbank.com.br/reference/confirmar-autenticidade-da-notificacao
  — o arquivo já indica onde isso entra.
- **Importante:** como as contas ainda vivem só no navegador (sem banco de
  dados conectado), o webhook não tem hoje como escrever `isPremium = true`
  de volta no `localStorage` do comprador depois que o pagamento é
  confirmado — essa "última milha" da ativação automática só fica completa
  quando o Supabase for religado (ver `## Banco de dados` acima) e as
  rotas `local*` do `index.html` voltarem a ser trocadas pelas chamadas a
  `/api/...`.
- Configure `PAGBANK_TOKEN` (e opcionalmente `PAGBANK_ENV=production`,
  padrão é sandbox) nas variáveis de ambiente — ver a tabela abaixo.

## IA: Groq

O botão "Assistente com IA" do app chama `/api/chat`, uma função serverless
**ativa** (não depende do banco de dados) que repassa a conversa para a API
da Groq (`https://api.groq.com/openai/v1/chat/completions`, compatível com
o formato da OpenAI). A chave fica **apenas no servidor**, na variável de
ambiente `GROQ_API_KEY` — não existe nenhum campo no frontend para o
usuário digitar a própria chave, e ela nunca é enviada ao navegador.

Modelos disponíveis no seletor de preferências:
- `openai/gpt-oss-120b` — recomendado, mais capaz (padrão)
- `openai/gpt-oss-20b` — mais rápido e econômico

> Os modelos servidos pela Groq mudam com alguma frequência. Se algum dia um
> modelo parar de responder, confira a lista atual em
> https://console.groq.com/docs/models e ajuste a lista `allowedModels` em
> `api/chat.js` e as `<option>` em `index.html`.

## Instalar e rodar localmente

```bash
npm install
cp .env.example .env        # preencha GROQ_API_KEY (DATABASE_URL só é necessário
                             # quando você reconectar o banco de dados)
vercel dev                  # serve tudo, incluindo a função /api/chat
```

## Variáveis de ambiente

| Variável          | Obrigatória agora? | Descrição                                                                 |
|-------------------|:-------------------:|----------------------------------------------------------------------------|
| `GROQ_API_KEY`    | Sim                 | Chave da API da Groq (console.groq.com/keys), usada pelo Instrutor IA      |
| `DATABASE_URL`    | Não (modo de teste) | Connection string do Supabase (Postgres) — só necessária quando reconectar o banco |
| `PAGBANK_TOKEN`   | Não (modo de teste) | Token da sua conta PagBank — só necessário ao reativar o pagamento real     |
| `PAGBANK_ENV`     | Não                  | `sandbox` (padrão) ou `production`                                        |
| `PUBLIC_BASE_URL` | Não                  | URL pública do site, usada pelas rotas de checkout/webhook quando ativas   |

## Deploy na Vercel

No modo de teste atual, o único requisito é cadastrar `GROQ_API_KEY` em
Project Settings → Environment Variables antes do deploy — o restante do
app funciona com os dados salvos no navegador de cada visitante. Quando for
reconectar o banco de dados, cadastre também `DATABASE_URL` (do Supabase) e,
se for reativar o Premium de verdade, `PAGBANK_TOKEN` — e rode
`npm run init-db` apontando para o banco de produção.

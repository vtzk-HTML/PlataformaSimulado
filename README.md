# PlataformaSimulado

Plataforma de simulados para as provas teóricas ANAC (Piloto Privado e Piloto
Comercial), com autenticação de usuários, histórico de simulados salvo no
banco de dados e um instrutor de IA integrado.

## Estrutura do projeto

```
.
├── index.html          # Frontend (SPA em HTML/CSS/JS puro)
├── api/
│   ├── chat.js           # Proxy serverless para a API da Groq (instrutor de IA)
│   ├── register.js       # POST { name, email, password, course, canac } → cria usuário
│   ├── login.js           # POST { email, password, canac } → autentica e retorna token + histórico
│   ├── me.js               # GET (Authorization: Bearer <token>) → restaura sessão (perfil + histórico)
│   ├── attempts.js        # POST (Authorization: Bearer <token>) → salva o resultado de um simulado
│   └── logout.js          # POST (Authorization: Bearer <token>) → invalida o token
├── db.js                # Cliente Neon (Postgres serverless), usado por todas as rotas acima
├── auth.js               # Helper compartilhado: valida o token de sessão (Bearer)
├── schema.sql             # Tabelas `users`, `sessions` e `attempts`
├── scripts/init-db.js     # Script para aplicar o schema.sql no Neon (rodar uma vez)
├── package.json
├── vercel.json
├── .env.example
└── .gitignore
```

## Banco de dados: Neon (Postgres)

A conta do usuário (nome, e-mail, senha com hash, curso, código CANAC) e o
histórico de simulados (cada tentativa, com acertos por matéria) ficam
salvos no Postgres do [Neon](https://neon.tech), não mais no navegador.

- `db.js` usa o driver `@neondatabase/serverless`, feito para funções
  serverless: cada consulta vira uma chamada HTTP, sem precisar manter
  conexões TCP abertas entre invocações — funciona bem na Vercel.
- `schema.sql` define três tabelas: `users`, `sessions` (tokens de login,
  com expiração) e `attempts` (histórico de simulados, um registro por
  tentativa finalizada).
- O schema **não** é aplicado a cada request (isso seria caro em
  serverless). Rode uma vez, localmente:

  ```bash
  cp .env.example .env        # preencha DATABASE_URL com a connection
                               # string do seu projeto no Neon Console
  npm install
  npm run init-db              # cria as tabelas no Neon
  ```

## Autenticação

O front-end guarda só o **token de sessão** no `localStorage` — a conta e o
histórico ficam de fato no banco. Ao carregar a página, o app chama
`GET /api/me` com o token salvo para restaurar a sessão; ao fazer login ou
criar conta, o token e o perfil (incluindo histórico) vêm na resposta.

- `api/register.js` — cria a conta (senha com bcrypt, 12 rounds) e já
  retorna um token de sessão (login automático).
- `api/login.js` — valida e-mail/senha/CANAC e retorna um token (válido por
  7 dias) junto com o histórico de simulados do usuário.
- `api/me.js` — restaura a sessão a partir do token salvo no navegador.
- `api/attempts.js` — salva cada simulado finalizado, associado ao usuário
  autenticado.
- `api/logout.js` — apaga o token no banco ao sair da conta.

Usuários que continuam "sem login" seguem funcionando normalmente, só que
sem histórico persistido (como antes).

## IA: Groq

O botão "Assistente com IA" do app chama `/api/chat`, uma função serverless
que repassa a conversa para a API da Groq (`https://api.groq.com/openai/v1/chat/completions`,
compatível com o formato da OpenAI). A chave fica **apenas no servidor**, na
variável de ambiente `GROQ_API_KEY` — não existe nenhum campo no frontend
para o usuário digitar a própria chave, e ela nunca é enviada ao navegador.

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
cp .env.example .env        # preencha DATABASE_URL e GROQ_API_KEY
npm run init-db             # cria as tabelas no Neon (uma vez só)
vercel dev                  # serve tudo, incluindo as funções em /api
```

## Variáveis de ambiente

| Variável       | Obrigatória | Descrição                                                        |
|----------------|:-----------:|--------------------------------------------------------------------|
| `DATABASE_URL` | Sim         | Connection string do Neon (Neon Console → Connection Details)      |
| `GROQ_API_KEY` | Sim         | Chave da API da Groq (console.groq.com/keys)                       |

## Deploy na Vercel

Nada de especial: como o Neon já é um Postgres persistente acessado por
HTTP, as funções em `/api` funcionam normalmente em produção — só é preciso
cadastrar `DATABASE_URL` e `GROQ_API_KEY` em Project Settings → Environment
Variables antes do deploy, e ter rodado `npm run init-db` pelo menos uma vez
apontando para o banco de produção.

# PlataformaSimulado

Plataforma de simulados para as provas teóricas ANAC (Piloto Privado e Piloto
Comercial), com autenticação de usuários e um instrutor de IA integrado.

## Estrutura do projeto

```
.
├── index.html          # Frontend (SPA em HTML/CSS/JS puro)
├── api/
│   ├── chat.js          # Proxy serverless para a API da Groq (instrutor de IA)
│   ├── login.js          # POST { email, password } → autentica e retorna token
│   └── register.js       # POST { name, email, password } → cria usuário
├── db.js                # Abre data/app.db e aplica o schema automaticamente
├── schema.sql            # Tabelas `users` e `sessions`
├── package.json
├── vercel.json
├── .env.example
└── .gitignore
```

## IA: Groq

O botão "Assistente com IA" do app chama `/api/chat`, uma função serverless
que repassa a conversa para a API da Groq (`https://api.groq.com/openai/v1/chat/completions`,
compatível com o formato da OpenAI). A chave fica **apenas no servidor**, na
variável de ambiente `GROQ_API_KEY` — não existe nenhum campo no frontend
para o usuário digitar a própria chave, e ela nunca é enviada ao navegador.

Modelos disponíveis no seletor de preferências:
- `openai/gpt-oss-120b` — recomendado, mais capaz (padrão)
- `openai/gpt-oss-20b` — mais rápido e econômico

> Os modelos servidos pela Groq mudam com alguma frequência (a própria Groq
> já aposentou `llama-3.3-70b-versatile` e `llama-3.1-8b-instant` em favor da
> família `gpt-oss`). Se algum dia um modelo parar de responder, confira a
> lista atual em https://console.groq.com/docs/models e ajuste a lista
> `allowedModels` em `api/chat.js` e as `<option>` em `index.html`.

## Autenticação / banco de dados

- `schema.sql` — tabelas `users` e `sessions`
- `db.js` — abre `data/app.db` (SQLite via `better-sqlite3`) e aplica o schema automaticamente
- `api/register.js` — `POST { name, email, password }` → cria usuário (senha com bcrypt, 12 rounds)
- `api/login.js` — `POST { email, password }` → valida e retorna um token de sessão (válido por 7 dias)

## Instalar e rodar localmente

```bash
npm install
cp .env.example .env        # preencha GROQ_API_KEY
node -e "require('./db')"   # cria data/app.db e as tabelas
vercel dev                  # ou seu servidor local preferido, para servir /api/*
```

## Variáveis de ambiente

| Variável       | Obrigatória | Descrição                                              |
|----------------|:-----------:|----------------------------------------------------------|
| `GROQ_API_KEY` | Sim         | Chave da API da Groq (console.groq.com/keys)             |
| `DB_PATH`      | Não         | Caminho do arquivo SQLite (padrão: `./data/app.db`)       |

## ⚠️ Importante se isso for para a Vercel

Em funções serverless da Vercel o sistema de arquivos é **somente leitura**,
exceto `/tmp`, que é **efêmero** — perdido a cada nova invocação/deploy. Ou
seja: **um arquivo `.db` normal não persiste em produção na Vercel**. Ele
serve bem para:
- Desenvolvimento local
- Qualquer servidor com disco persistente (VPS, Railway, Fly.io, Render, etc.)

Se o destino final é a Vercel, a opção mais próxima de "SQLite" que persiste
de verdade é o **Turso** (libSQL) — mesma linguagem SQL, API bem parecida com
`better-sqlite3`, mas com storage remoto persistente. É só trocar o `db.js`
pelo client do Turso; `schema.sql` e os endpoints continuam quase iguais.
A parte de IA (Groq) não é afetada por essa questão, pois não depende do
banco local.

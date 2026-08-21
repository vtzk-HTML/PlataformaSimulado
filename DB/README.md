# Banco SQLite de usuários/autenticação

## Arquivos
- `schema.sql` — tabelas `users` e `sessions`
- `db.js` — abre `data/app.db` e aplica o schema automaticamente
- `api/register.js` — `POST { name, email, password }` → cria usuário (senha com bcrypt, 12 rounds)
- `api/login.js` — `POST { email, password }` → valida e retorna um token de sessão (válido por 7 dias)

## Instalar e rodar localmente
```bash
npm install
node -e "require('./db')"   # cria data/app.db e as tabelas
```

Testado localmente: registro, login com senha certa, login com senha errada (401) e e-mail duplicado (409) — todos funcionando.

## ⚠️ Importante se isso for para a Vercel
Vi que seu `chat.js` é uma função serverless da Vercel. Nesse ambiente o sistema de
arquivos é **somente leitura**, exceto `/tmp`, que é **efêmero** — perdido a cada
nova invocação/deploy. Ou seja: **um arquivo `.db` normal não persiste em produção
na Vercel**. Ele serve bem para:
- Desenvolvimento local
- Qualquer servidor com disco persistente (VPS, Railway, Fly.io, Render, etc.)

Se o destino final é a Vercel, a opção mais próxima de "SQLite" que persiste de
verdade é o **Turso** (libSQL) — mesma linguagem SQL, API bem parecida com
`better-sqlite3`, mas com storage remoto persistente. É só trocar o `db.js` pelo
client do Turso; o `schema.sql` e os endpoints continuam quase iguais.

Posso adaptar para o Turso se for esse o seu caso — é só avisar.

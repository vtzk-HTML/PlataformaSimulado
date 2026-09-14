// db.js
// Conexão com o banco Postgres do Supabase, usada por todas as funções em
// /api (hoje "em standby" — o front-end lê e escreve no localStorage
// enquanto isso; ver a seção "Modo de teste" no README).
//
// Usa a biblioteca "postgres" (pacote npm `postgres`, de porsager), que
// expõe a mesma interface de template string sql`...` que o driver da Neon
// usava antes — por isso as queries dentro das rotas em /api (login.js,
// register.js, attempts.js, etc.) não precisaram mudar, só a conexão aqui.
//
// Como configurar (Supabase → Project Settings → Database → Connection
// string):
//   - Para as funções em /api (serverless, vida curta): use a connection
//     string do "Transaction pooler" (Supavisor/PgBouncer), porta 6543.
//     Formato típico:
//     postgresql://postgres.<project-ref>:<senha>@aws-0-<região>.pooler.supabase.com:6543/postgres
//   - Para rodar scripts/init-db.js (roda uma vez, localmente): pode usar a
//     mesma string, ou a conexão direta (porta 5432) — DDL funciona melhor
//     fora do modo "transaction" do pooler.
//
// Defina a connection string numa destas variáveis de ambiente:
//   - DATABASE_URL     → nome padrão, usado no .env local
//   - SUPABASE_DB_URL  → alternativa, caso prefira esse nome

const postgres = require("postgres");

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  throw new Error(
    "Nenhuma connection string do Supabase encontrada. Defina DATABASE_URL ou SUPABASE_DB_URL nas variáveis de ambiente."
  );
}

const sql = postgres(connectionString, {
  ssl: "require",
  // O "Transaction pooler" do Supabase (Supavisor/PgBouncer) não suporta
  // prepared statements — desligamos aqui para evitar erros do tipo
  // "prepared statement already exists" em ambiente serverless.
  prepare: false,
});

module.exports = { sql };

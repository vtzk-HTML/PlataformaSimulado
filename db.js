// db.js
// Conexão com o banco Postgres do Neon, usada por todas as funções em /api.
//
// Usa o driver "@neondatabase/serverless", feito para rodar bem em funções
// serverless (Vercel): cada chamada `sql\`...\`` vira uma requisição HTTP,
// sem precisar manter um pool de conexões TCP entre invocações.
//
// Configure a variável de ambiente DATABASE_URL com a "connection string"
// do seu projeto Neon (Neon Console → Connection Details → algo como
// postgresql://usuario:senha@ep-xxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require).
//
// O schema (tabelas users/sessions/attempts) NÃO é aplicado automaticamente
// a cada request (isso seria caro em serverless). Rode uma vez:
//   node scripts/init-db.js
// (ver README para detalhes).

const { neon } = require("@neondatabase/serverless");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL não configurada. Defina a connection string do Neon nas variáveis de ambiente."
  );
}

const sql = neon(process.env.DATABASE_URL);

module.exports = { sql };

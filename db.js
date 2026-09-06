// db.js
// Conexão com o banco Postgres do Neon, usada por todas as funções em /api.
//
// Usa o driver "@neondatabase/serverless", feito para rodar bem em funções
// serverless (Vercel): cada chamada `sql\`...\`` vira uma requisição HTTP,
// sem precisar manter um pool de conexões TCP entre invocações.
//
// Configure a "connection string" do seu projeto Neon numa destas variáveis
// de ambiente (Neon Console → Connection Details → algo como
// postgresql://usuario:senha@ep-xxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require):
//   - DATABASE_URL                     → nome padrão, usado no .env local
//   - NEON_DATABASE_URL                → nome simples, se você criou assim
//   - NEON_DATABASE_URL_POSTGRES_URL   → nome criado pela integração Neon↔Vercel
//                                        quando o "Custom Prefix" é NEON_DATABASE_URL
//                                        (a integração cria várias variáveis com
//                                        esse prefixo; esta é a pooled connection
//                                        string, recomendada para serverless)
//
// O schema (tabelas users/sessions/attempts) NÃO é aplicado automaticamente
// a cada request (isso seria caro em serverless). Rode uma vez:
//   node scripts/init-db.js
// (ver README para detalhes).

const { neon } = require("@neondatabase/serverless");

const connectionString =
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.NEON_DATABASE_URL_POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "Nenhuma connection string do Neon encontrada. Defina DATABASE_URL, NEON_DATABASE_URL ou NEON_DATABASE_URL_POSTGRES_URL nas variáveis de ambiente."
  );
}

const sql = neon(connectionString);

module.exports = { sql };

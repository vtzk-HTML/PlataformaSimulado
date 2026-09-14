// scripts/init-db.js
// Roda uma vez (local) para criar as tabelas no banco Supabase a partir de schema.sql.
//
// Uso:
//   cp .env.example .env   # preencha DATABASE_URL (ou SUPABASE_DB_URL)
//   npm install
//   npm run init-db
//
// Dica: para rodar este script, prefira a connection string de conexão
// direta do Supabase (porta 5432) ou o pooler em modo "Session" — DDL
// (CREATE TABLE, ALTER TABLE etc.) não é recomendado através do pooler em
// modo "Transaction" (porta 6543), que é o indicado só para as funções
// em /api no dia a dia.

const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    console.error(
      "Nenhuma connection string do Supabase encontrada (DATABASE_URL / SUPABASE_DB_URL). Configure-a antes de rodar este script."
    );
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, "..", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  const sql = postgres(connectionString, { ssl: "require" });
  try {
    await sql.unsafe(schema);
    console.log("✓ Schema aplicado com sucesso no banco Supabase (users, sessions, attempts, premium_payments).");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("Falha ao aplicar o schema:", err);
  process.exit(1);
});

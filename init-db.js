// scripts/init-db.js
// Roda uma vez (local) para criar as tabelas no banco Neon a partir de schema.sql.
//
// Uso:
//   cp .env.example .env   # preencha DATABASE_URL
//   npm install
//   node -r dotenv/config scripts/init-db.js
//
// (ou exporte DATABASE_URL na sua shell antes de rodar `node scripts/init-db.js`)

const fs = require("fs");
const path = require("path");
const { Client } = require("@neondatabase/serverless");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não definida. Configure-a antes de rodar este script.");
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, "..", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  const client = new Client(process.env.DATABASE_URL);
  await client.connect();
  try {
    await client.query(schema);
    console.log("✓ Schema aplicado com sucesso no banco Neon (users, sessions, attempts).");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Falha ao aplicar o schema:", err);
  process.exit(1);
});

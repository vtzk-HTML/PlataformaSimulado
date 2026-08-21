// db.js
// Abre (ou cria, se não existir) o arquivo SQLite e garante que o schema exista.
//
// ATENÇÃO — se este projeto roda em Vercel (funções serverless):
// o sistema de arquivos é somente-leitura, exceto a pasta /tmp, que é EFÊMERA
// (perdida a qualquer momento entre invocações e sempre a cada novo deploy).
// Ou seja: um arquivo .db comum aqui NÃO É PERSISTENTE em produção na Vercel.
//
// Isso funciona normalmente:
//  - Rodando localmente (node/Express, etc.)
//  - Em qualquer servidor com disco persistente (VPS, Railway, Render, etc.)
//
// Para persistir de verdade na Vercel, troque por um SQLite "remoto"
// como o Turso (libSQL) — mesma linguagem SQL, drop-in bem parecido,
// mas com storage de verdade. Ver nota no final do README.

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "app.db");

// Garante que a pasta data/ exista
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Aplica o schema (idempotente — CREATE TABLE IF NOT EXISTS)
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

module.exports = db;

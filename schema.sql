-- schema.sql
-- Banco de dados Postgres (Neon) para autenticação de usuários.
-- Aplique este schema uma vez com `npm run migrate` (ver migrate.js).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ALTER ... ADD COLUMN IF NOT EXISTS em vez de colocar direto no CREATE TABLE:
-- assim o schema continua idempotente mesmo se `users` já existia (rodado antes
-- desta migração adicionar course/canac).
ALTER TABLE users ADD COLUMN IF NOT EXISTS course TEXT NOT NULL DEFAULT 'PP';
ALTER TABLE users ADD COLUMN IF NOT EXISTS canac  TEXT;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Sessões/tokens ativos (necessário para login persistente entre requisições,
-- já que cada função serverless não guarda estado em memória)
CREATE TABLE IF NOT EXISTS sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Histórico de tentativas de simulado (substitui o array `history` que antes
-- vivia só no localStorage do navegador)
CREATE TABLE IF NOT EXISTS attempts (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_date    TEXT NOT NULL,
  course          TEXT NOT NULL,
  total           INTEGER NOT NULL,
  correct         INTEGER NOT NULL,
  pct             NUMERIC NOT NULL,
  by_subject      JSONB NOT NULL,
  elapsed_seconds INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);

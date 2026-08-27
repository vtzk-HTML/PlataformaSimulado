-- schema.sql
-- Banco de dados Postgres (Neon) para autenticação de usuários e
-- histórico de simulados da PlataformaSimulado.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  course        TEXT,             -- "PP" ou "PC"
  canac         TEXT,             -- código CANAC informado no cadastro
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Sessões/tokens ativos (usado para autenticar chamadas às demais rotas)
CREATE TABLE IF NOT EXISTS sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Histórico de simulados de cada usuário (substitui o localStorage do front-end)
CREATE TABLE IF NOT EXISTS attempts (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course          TEXT NOT NULL,
  total           INTEGER NOT NULL,
  correct         INTEGER NOT NULL,
  pct             INTEGER NOT NULL,
  by_subject      JSONB NOT NULL,        -- { "materia": {correct, total}, ... }
  elapsed_seconds INTEGER,
  attempt_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, attempt_date);

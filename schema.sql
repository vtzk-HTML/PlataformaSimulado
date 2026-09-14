-- schema.sql
-- Banco de dados Postgres (Supabase) para autenticação de usuários e
-- histórico de simulados da PlataformaSimulado.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  course        TEXT,             -- "PP" ou "PC"
  canac         TEXT,             -- código CANAC informado no cadastro
  is_premium    BOOLEAN NOT NULL DEFAULT FALSE, -- true após pagamento aprovado do Premium
  premium_at    TIMESTAMPTZ,      -- quando o Premium foi ativado
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Migração idempotente: contas criadas antes do recurso Premium existir.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_at TIMESTAMPTZ;

-- Registro de pagamentos do Premium (Mercado Pago), para auditoria e para
-- evitar processar a mesma notificação de pagamento duas vezes.
CREATE TABLE IF NOT EXISTS premium_payments (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL DEFAULT 'mercadopago',
  payment_id    TEXT NOT NULL,        -- id do pagamento no Mercado Pago
  status        TEXT NOT NULL,        -- approved, pending, rejected, etc.
  amount        NUMERIC(10,2),
  raw           JSONB,                -- payload bruto retornado pela API, para depuração
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, payment_id)
);

CREATE INDEX IF NOT EXISTS idx_premium_payments_user ON premium_payments(user_id);

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
  answers         JSONB,                 -- detalhe questão a questão: [{questionId, subject,
                                          -- question, options, correctIndex, chosenIndex,
                                          -- isCorrect}, ...] — histórico completo da tentativa
  elapsed_seconds INTEGER,
  attempt_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migração idempotente: se a tabela "attempts" já existia de antes (sem a
-- coluna "answers"), o CREATE TABLE IF NOT EXISTS acima é ignorado e esta
-- linha garante que a coluna nova seja criada mesmo assim, sem apagar
-- nenhum dado já salvo.
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS answers JSONB;

CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, attempt_date);

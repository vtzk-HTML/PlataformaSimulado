// api/attempts.js
// POST com header Authorization: Bearer <token> e body { date, course, total,
// correct, pct, bySubject, elapsedSeconds } → salva uma tentativa de simulado
// para o usuário logado. Substitui o antigo `user.history.push(...)` que só
// existia no localStorage.

const sql = require("../db");
const { requireUser } = require("../lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    const user = await requireUser(req, res);
    if (!user) return; // requireUser já respondeu 401

    const { date, course, total, correct, pct, bySubject, elapsedSeconds } = req.body || {};

    if (!date || !course || total == null || correct == null || pct == null || !bySubject) {
      res.status(400).json({ error: "Dados da tentativa incompletos." });
      return;
    }

    await sql`
      INSERT INTO attempts (user_id, attempt_date, course, total, correct, pct, by_subject, elapsed_seconds)
      VALUES (
        ${user.id}, ${date}, ${course}, ${total}, ${correct}, ${pct},
        ${JSON.stringify(bySubject)}::jsonb, ${elapsedSeconds ?? null}
      )
    `;

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Erro em /api/attempts:", err);
    res.status(500).json({ error: "Erro interno ao salvar tentativa." });
  }
};

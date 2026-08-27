// api/attempts.js
// Salva o resultado de um simulado para o usuário autenticado.
// POST { course, total, correct, pct, bySubject, elapsedSeconds, date }
// Requer Authorization: Bearer <token>.

const { sql } = require("../db");
const { requireUser } = require("../auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    const user = await requireUser(req);
    if (!user) {
      res.status(401).json({ error: "Sessão inválida ou expirada." });
      return;
    }

    const { course, total, correct, pct, bySubject, elapsedSeconds, date } = req.body || {};

    if (!course || total == null || correct == null || pct == null || !bySubject) {
      res.status(400).json({ error: "Dados do resultado do simulado incompletos." });
      return;
    }

    const attemptDate = date ? new Date(date) : new Date();

    const [attempt] = await sql`
      INSERT INTO attempts (user_id, course, total, correct, pct, by_subject, elapsed_seconds, attempt_date)
      VALUES (
        ${user.id}, ${course}, ${total}, ${correct}, ${pct},
        ${JSON.stringify(bySubject)}, ${elapsedSeconds || null}, ${attemptDate.toISOString()}
      )
      RETURNING
        course, total, correct, pct,
        by_subject AS "bySubject",
        elapsed_seconds AS "elapsedSeconds",
        attempt_date AS "date"
    `;

    res.status(201).json({ attempt });
  } catch (err) {
    console.error("Erro em /api/attempts:", err);
    res.status(500).json({ error: "Erro interno ao salvar o resultado." });
  }
};

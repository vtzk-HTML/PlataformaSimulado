// api/me.js
// Retorna o perfil + histórico do usuário dono do token enviado em
// Authorization: Bearer <token>. Usado para restaurar a sessão quando o
// app é recarregado (o front-end só guarda o token no localStorage).

const { sql } = require("../db");
const { requireUser } = require("../auth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    const user = await requireUser(req);
    if (!user) {
      res.status(401).json({ error: "Sessão inválida ou expirada." });
      return;
    }

    const history = await sql`
      SELECT
        course,
        total,
        correct,
        pct,
        by_subject AS "bySubject",
        elapsed_seconds AS "elapsedSeconds",
        attempt_date AS "date"
      FROM attempts
      WHERE user_id = ${user.id}
      ORDER BY attempt_date ASC
    `;

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        course: user.course,
        canac: user.canac,
        createdAt: user.created_at,
        history,
      },
    });
  } catch (err) {
    console.error("Erro em /api/me:", err);
    res.status(500).json({ error: "Erro interno ao carregar sessão." });
  }
};

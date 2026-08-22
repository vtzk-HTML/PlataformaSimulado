// api/me.js
// GET com header Authorization: Bearer <token> → devolve o usuário logado e
// seu histórico de tentativas. Usado no boot da página para restaurar a
// sessão a partir do token salvo no localStorage (o localStorage agora só
// guarda o token, não mais os dados do usuário).

const sql = require("../db");
const { getBearerToken, getUserFromToken } = require("../lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    const token = getBearerToken(req);
    const user = await getUserFromToken(token);
    if (!user) {
      res.status(401).json({ error: "Sessão inválida ou expirada." });
      return;
    }

    const attempts = await sql`
      SELECT attempt_date AS date, course, total, correct, pct,
             by_subject AS "bySubject", elapsed_seconds AS "elapsedSeconds"
      FROM attempts
      WHERE user_id = ${user.id}
      ORDER BY created_at ASC
    `;

    res.status(200).json({ user: { ...user, history: attempts } });
  } catch (err) {
    console.error("Erro em /api/me:", err);
    res.status(500).json({ error: "Erro interno." });
  }
};

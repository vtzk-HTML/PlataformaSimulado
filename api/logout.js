// api/logout.js
// Invalida o token de sessão atual (apaga a linha em `sessions`).
// Chamado com Authorization: Bearer <token>. Sempre responde 200 —
// logout no front-end acontece de qualquer forma, isto é só limpeza no DB.

const { sql } = require("../db");
const { getBearerToken } = require("../auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const token = getBearerToken(req);
  if (token) {
    try {
      await sql`DELETE FROM sessions WHERE token = ${token}`;
    } catch (err) {
      console.error("Erro em /api/logout:", err);
    }
  }

  res.status(200).json({ ok: true });
};

// api/logout.js
// POST com header Authorization: Bearer <token> → apaga a sessão no servidor.
// Sem isso, "logout" seria só cosmético: o token continuaria válido por até
// 7 dias mesmo depois do usuário clicar em sair.

const sql = require("../db");
const { getBearerToken } = require("../lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    const token = getBearerToken(req);
    if (token) {
      await sql`DELETE FROM sessions WHERE token = ${token}`;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro em /api/logout:", err);
    res.status(500).json({ error: "Erro interno ao encerrar sessão." });
  }
};

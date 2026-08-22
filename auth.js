// lib/auth.js
// Helper compartilhado para validar o token de sessão (Authorization: Bearer <token>).
// Fica fora da pasta api/ de propósito: qualquer arquivo .js dentro de api/ na
// Vercel vira uma rota automaticamente, e este módulo não é um endpoint.

const sql = require("../db");

function getBearerToken(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

async function getUserFromToken(token) {
  if (!token) return null;

  const rows = await sql`
    SELECT u.id, u.name, u.email, u.course, u.canac, u.created_at, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
  `;
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    course: row.course,
    canac: row.canac,
    createdAt: row.created_at,
  };
}

// Valida o token da requisição e já responde 401 se inválido.
// Retorna o usuário se tudo certo, ou `null` (e já cuidou da resposta) se não.
async function requireUser(req, res) {
  const token = getBearerToken(req);
  const user = await getUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: "Sessão inválida ou expirada. Faça login novamente." });
    return null;
  }
  return user;
}

module.exports = { getBearerToken, getUserFromToken, requireUser };

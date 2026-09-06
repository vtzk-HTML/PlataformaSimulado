// auth.js
// Helpers compartilhados pelas rotas em /api para autenticar requisições
// via token de sessão (Authorization: Bearer <token>).

const { sql } = require("./db");

function getBearerToken(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

// Retorna o usuário dono do token, ou null se o token não existir/expirou.
async function getUserFromToken(token) {
  if (!token) return null;
  const rows = await sql`
    SELECT u.id, u.name, u.email, u.course, u.canac, u.created_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > now()
  `;
  return rows[0] || null;
}

// Atalho para as rotas: extrai o token do header e resolve o usuário.
async function requireUser(req) {
  const token = getBearerToken(req);
  return getUserFromToken(token);
}

module.exports = { getBearerToken, getUserFromToken, requireUser };

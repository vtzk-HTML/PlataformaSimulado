// api/login.js
// Autentica um usuário: recebe { email, password, canac } e retorna um
// token de sessão junto com o perfil e o histórico de simulados.

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sql } = require("../db");

const SESSION_DURATION_HOURS = 24 * 7; // 7 dias

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const { email, password, canac } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ error: "Campos 'email' e 'password' são obrigatórios." });
    return;
  }

  try {
    const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (!user) {
      res.status(401).json({ error: "E-mail ou senha inválidos." });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      res.status(401).json({ error: "E-mail ou senha inválidos." });
      return;
    }

    if (canac && user.canac && canac !== user.canac) {
      res.status(401).json({ error: "Código CANAC não confere com o cadastro desta conta." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_HOURS * 3600 * 1000
    ).toISOString();

    await sql`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt})
    `;

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
      token,
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
    console.error("Erro em /api/login:", err);
    res.status(500).json({ error: "Erro interno ao autenticar." });
  }
};

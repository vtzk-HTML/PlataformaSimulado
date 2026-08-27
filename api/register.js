// api/register.js
// Cria um novo usuário: recebe { name, email, password, course, canac }
// e devolve um token de sessão (já loga o usuário, como o front-end espera).

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sql } = require("../db");

const SESSION_DURATION_HOURS = 24 * 7; // 7 dias

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const { name, email, password, course, canac } = req.body || {};

  if (!name || !email || !password || !canac) {
    res.status(400).json({
      error: "Campos 'name', 'email', 'password' e 'canac' são obrigatórios.",
    });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres." });
    return;
  }

  try {
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      res.status(409).json({ error: "Já existe um usuário com este e-mail." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await sql`
      INSERT INTO users (name, email, password_hash, course, canac)
      VALUES (${name}, ${email}, ${passwordHash}, ${course || null}, ${canac})
      RETURNING id, name, email, course, canac, created_at
    `;

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_HOURS * 3600 * 1000
    ).toISOString();

    await sql`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt})
    `;

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        course: user.course,
        canac: user.canac,
        createdAt: user.created_at,
        history: [],
      },
    });
  } catch (err) {
    console.error("Erro em /api/register:", err);
    res.status(500).json({ error: "Erro interno ao criar usuário." });
  }
};

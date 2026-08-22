// api/login.js
// Autentica um usuário: recebe { email, password } e retorna um token de sessão.

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../db");

const SESSION_DURATION_HOURS = 24 * 7; // 7 dias

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ error: "Campos 'email' e 'password' são obrigatórios." });
    return;
  }

  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      res.status(401).json({ error: "E-mail ou senha inválidos." });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      res.status(401).json({ error: "E-mail ou senha inválidos." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 3600 * 1000).toISOString();

    db.prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)").run(
      user.id,
      token,
      expiresAt
    );

    res.status(200).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Erro em /api/login:", err);
    res.status(500).json({ error: "Erro interno ao autenticar." });
  }
};

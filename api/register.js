// api/register.js
// Cria um novo usuário: recebe { name, email, password }.

const bcrypt = require("bcryptjs");
const db = require("../db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    res.status(400).json({ error: "Campos 'name', 'email' e 'password' são obrigatórios." });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres." });
    return;
  }

  try {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      res.status(409).json({ error: "Já existe um usuário com este e-mail." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const info = db
      .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
      .run(name, email, passwordHash);

    res.status(201).json({ id: info.lastInsertRowid, name, email });
  } catch (err) {
    console.error("Erro em /api/register:", err);
    res.status(500).json({ error: "Erro interno ao criar usuário." });
  }
};

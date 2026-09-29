// api/admin.js
// Painel administrativo simples: permite buscar um usuário pelo e-mail e
// ativar/desativar o Premium manualmente — pensado para o fluxo de
// pagamento via Pix manual (ver PREMIUM_PIX_KEY em index.html): a pessoa
// paga o Pix e envia o comprovante; você confere e ativa o Premium por
// aqui.
//
// STATUS ATUAL: "em standby" — assim como as demais rotas em /api, esta
// função depende do banco de dados (Neon) estar configurado. Enquanto o
// front-end (index.html) usa contas salvas no localStorage do navegador
// (modo de teste), este endpoint não enxerga essas contas — ele só opera
// sobre usuários que já existem na tabela `users` do Postgres. Ou seja,
// para o painel de admin fazer sentido de verdade (ativar Premium na conta
// de outra pessoa, de qualquer lugar), o cadastro/login também precisa
// estar usando a API de verdade (/api/register, /api/login, /api/me), e
// não mais o localStorage.
//
// Autenticação: bem simples de propósito (é um painel para uma única
// pessoa, você). Protegido por uma senha fixa guardada em variável de
// ambiente — NUNCA no código-fonte nem no front-end:
//   - ADMIN_PASSWORD
//
// POST body: { password, email, action }
//   action: "activate"   → ativa o Premium para o e-mail informado
//           "deactivate" → desativa o Premium para o e-mail informado
//           "lookup"     → só consulta o usuário (sem alterar nada)

const { sql } = require("../db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(500).json({ error: "ADMIN_PASSWORD não configurada no servidor." });
    return;
  }

  const { password, email, action } = req.body || {};

  if (!password || password !== adminPassword) {
    // Pequeno atraso para dificultar tentativas de força bruta.
    await new Promise((r) => setTimeout(r, 400));
    res.status(401).json({ error: "Senha de administrador incorreta." });
    return;
  }

  if (!email) {
    res.status(400).json({ error: "Informe o e-mail do usuário." });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    if (action === "activate" || action === "deactivate") {
      const isPremium = action === "activate";
      const [user] = await sql`
        UPDATE users
        SET is_premium = ${isPremium},
            premium_at = CASE WHEN ${isPremium} THEN COALESCE(premium_at, now()) ELSE premium_at END,
            updated_at = now()
        WHERE email = ${normalizedEmail}
        RETURNING id, name, email, course, canac, is_premium, premium_at, created_at
      `;

      if (!user) {
        res.status(404).json({ error: `Nenhum usuário encontrado com o e-mail ${normalizedEmail}.` });
        return;
      }

      if (isPremium) {
        // Guarda um registro simples da ativação manual, para auditoria.
        await sql`
          INSERT INTO premium_payments (user_id, provider, payment_id, status, amount, raw)
          VALUES (${user.id}, 'pix-manual', ${`manual-${Date.now()}`}, 'approved', 9.99, ${JSON.stringify({ activatedBy: "admin", pixKey: "viitor.lf@gmail.com" })})
        `;
      }

      res.status(200).json({ ok: true, user });
      return;
    }

    if (action === "lookup") {
      const [user] = await sql`
        SELECT id, name, email, course, canac, is_premium, premium_at, created_at
        FROM users WHERE email = ${normalizedEmail}
      `;
      if (!user) {
        res.status(404).json({ error: `Nenhum usuário encontrado com o e-mail ${normalizedEmail}.` });
        return;
      }
      res.status(200).json({ ok: true, user });
      return;
    }

    res.status(400).json({ error: "Ação inválida. Use 'lookup', 'activate' ou 'deactivate'." });
  } catch (err) {
    console.error("Erro em /api/admin:", err);
    res.status(500).json({ error: "Erro interno ao processar a solicitação." });
  }
};

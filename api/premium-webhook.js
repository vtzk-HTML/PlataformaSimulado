// api/premium-webhook.js
// Recebe as notificações (webhooks) do PagBank sobre o Checkout criado em
// api/checkout.js. O PagBank manda dois formatos de notificação diferentes,
// ambas por POST, para a mesma URL (ver notification_urls e
// payment_notification_urls em checkout.js):
//
//  1) Notificação de CHECKOUT (ex: quando o checkout expira sem uso) —
//     payload com { id: "CHEC_...", reference_id, status, links, ... }.
//  2) Notificação de PAGAMENTO (quando o pedido gerado pelo checkout é
//     pago) — payload de "Order", com { id: "ORDE_...", reference_id,
//     charges: [{ status: "PAID" | "DECLINED" | ... }], ... }.
//
// STATUS ATUAL: "em standby" — como as contas e o status Premium ainda
// vivem no localStorage do navegador (ver README), este webhook não tem
// como escrever de volta no dispositivo do usuário. Por isso, hoje ele só
// confirma/loga o pagamento aprovado (para você conferir no log da
// Vercel). Quando reconectar um banco de dados de verdade, descomente o
// bloco marcado abaixo para persistir `users.is_premium = true`.
//
// Configure PAGBANK_TOKEN (mesma variável usada em checkout.js).
//
// Importante (segurança): antes de usar isso em produção, implemente a
// confirmação de autenticidade da notificação descrita em
// https://developer.pagbank.com.br/reference/confirmar-autenticidade-da-notificacao
// (assinatura SHA-256), para garantir que a notificação realmente veio do
// PagBank antes de liberar qualquer coisa.

module.exports = async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    const body = req.body || {};

    // Notificação de pagamento (Order/Charge): tem um array `charges`.
    if (Array.isArray(body.charges)) {
      const paidCharge = body.charges.find((c) => c.status === "PAID");
      if (paidCharge) {
        // O reference_id do pedido normalmente carrega o que enviamos ao
        // criar o checkout ("premium-<userId>-<timestamp>"), mas isso deve
        // ser confirmado no seu ambiente de sandbox antes de confiar 100%
        // nesse formato em produção.
        const match = /^premium-([^-]+)-/.exec(body.reference_id || "");
        const userId = match ? match[1] : null;

        console.log(
          `[premium-webhook] pagamento aprovado — pedido ${body.id}, reference_id ${body.reference_id}, usuário: ${userId || "não identificado"}`
        );

        /* Quando o banco de dados estiver conectado de novo, troque o log
           acima por algo como:

           const { sql } = require("../db");
           if (userId) {
             await sql`UPDATE users SET is_premium = TRUE, premium_at = COALESCE(premium_at, now()) WHERE id = ${userId}`;
             await sql`
               INSERT INTO premium_payments (user_id, provider, payment_id, status, amount, raw)
               VALUES (${userId}, 'pagbank', ${paidCharge.id}, ${paidCharge.status}, ${(paidCharge.amount && paidCharge.amount.value) ? paidCharge.amount.value / 100 : null}, ${JSON.stringify(body)})
               ON CONFLICT (provider, payment_id) DO UPDATE SET status = EXCLUDED.status, raw = EXCLUDED.raw
             `;
           }
        */
      } else {
        console.log(`[premium-webhook] notificação de pagamento sem cobrança aprovada — pedido ${body.id}`);
      }
      res.status(200).json({ ok: true });
      return;
    }

    // Notificação de status do checkout (ex: EXPIRED) — nada a fazer além
    // de registrar, já que não representa um pagamento confirmado.
    if (body.id && body.status) {
      console.log(`[premium-webhook] status do checkout ${body.id}: ${body.status}`);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro em /api/premium-webhook:", err);
    // Ainda assim respondemos 200: erros aqui não devem gerar reenvio
    // indefinido da notificação pelo PagBank. O log acima permite investigar depois.
    res.status(200).json({ ok: true });
  }
};

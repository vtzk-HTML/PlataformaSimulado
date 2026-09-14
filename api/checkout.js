// api/checkout.js
// Cria um Checkout do PagBank (página de pagamento hospedada — Pix, cartão,
// boleto) para o usuário assinar o Premium (pagamento único de R$ 9,99) e
// devolve a URL de pagamento (link com rel "PAY") para o front-end
// redirecionar o navegador.
//
// STATUS ATUAL: "em standby" — o front-end (index.html) não chama esta rota
// hoje, porque as contas ainda vivem no localStorage (ver README). Este
// arquivo fica pronto para quando o backend com banco de dados for
// reconectado.
//
// Como a conta do usuário hoje não vive em um banco de dados (ver
// db.js/auth.js "em standby"), esta rota recebe os dados do usuário
// (id, name, email) diretamente no corpo da requisição, em vez de resolver
// isso a partir de um token de sessão no Postgres. Quando o backend de
// contas for reconectado, o ideal é validar esses dados a partir de uma
// sessão no servidor (como as outras rotas em /api fazem via auth.js), em
// vez de confiar no que o navegador envia.
//
// Configure o token da sua conta PagBank (Portal do Desenvolvedor PagBank →
// Minhas aplicações / Tokens) na variável de ambiente:
//   - PAGBANK_TOKEN
//
// E o ambiente (sandbox por padrão, ou produção):
//   - PAGBANK_ENV = "sandbox" (padrão) ou "production"
//
// Opcionalmente, defina PUBLIC_BASE_URL (ex: https://seusite.vercel.app)
// para controlar as URLs de retorno/notificação. Se não for definida, a
// própria função tenta descobrir a partir dos headers da requisição.

const PREMIUM_PRICE_BRL = 9.99; // mantenha em sincronia com o texto no front-end

function resolveBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function pagbankApiBase() {
  return process.env.PAGBANK_ENV === "production"
    ? "https://api.pagseguro.com"
    : "https://sandbox.api.pagseguro.com";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const token = process.env.PAGBANK_TOKEN;
  if (!token) {
    res.status(500).json({ error: "PAGBANK_TOKEN não configurada no servidor." });
    return;
  }

  try {
    const { id, name, email } = req.body || {};
    if (!id || !email) {
      res.status(400).json({ error: "Dados do usuário ausentes para iniciar o pagamento." });
      return;
    }

    const baseUrl = resolveBaseUrl(req);
    const webhookUrl = `${baseUrl}/api/premium-webhook`;

    const checkoutBody = {
      reference_id: `premium-${id}-${Date.now()}`.slice(0, 64),
      customer_modifiable: true, // o próprio comprador preenche nome/e-mail/CPF na página do PagBank
      items: [
        {
          reference_id: "PREMIUM",
          name: "ANACfly Premium — acesso liberado à IA, Metas e Flashcards",
          quantity: 1,
          unit_amount: Math.round(PREMIUM_PRICE_BRL * 100), // em centavos
        },
      ],
      payment_methods: [
        { type: "PIX" },
        { type: "CREDIT_CARD" },
        { type: "BOLETO" },
      ],
      redirect_url: `${baseUrl}/?premium=return`,
      return_url: baseUrl,
      // Notificações de status do checkout (ex: expirou) e do pagamento
      // (ex: PAID) — ambas apontam para o mesmo webhook, que já sabe
      // diferenciar os dois formatos de payload (ver premium-webhook.js).
      notification_urls: [webhookUrl],
      payment_notification_urls: [webhookUrl],
    };

    const pbRes = await fetch(`${pagbankApiBase()}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(checkoutBody),
    });

    const data = await pbRes.json();

    if (!pbRes.ok) {
      console.error("Erro ao criar checkout no PagBank:", data);
      res.status(502).json({ error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." });
      return;
    }

    const payLink = Array.isArray(data.links) && data.links.find((l) => l.rel === "PAY");
    if (!payLink) {
      console.error("Resposta do PagBank sem link de pagamento (rel=PAY):", data);
      res.status(502).json({ error: "Não foi possível montar o link de pagamento." });
      return;
    }

    res.status(200).json({
      checkoutId: data.id,
      payUrl: payLink.href,
    });
  } catch (err) {
    console.error("Erro em /api/checkout:", err);
    res.status(500).json({ error: "Erro interno ao iniciar o pagamento." });
  }
};

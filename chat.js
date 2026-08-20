// /api/chat.js
// Função serverless (Vercel) que recebe { model, max_tokens, system, messages }
// do frontend e repassa para o Vercel AI Gateway, usando a chave guardada
// com segurança na variável de ambiente AI_GATEWAY_API_KEY (nunca exposta ao navegador).
//
// Não existe, em nenhum lugar do frontend, um campo para o usuário inserir a
// própria chave de API — a chave é cadastrada apenas aqui, no servidor
// (Vercel > Project Settings > Environment Variables).
//
// O AI Gateway expõe um endpoint no formato da OpenAI (/v1/chat/completions),
// mas os modelos são identificados como "provedor/modelo", ex: "openai/gpt-5.6-luna".

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "AI_GATEWAY_API_KEY não configurada no servidor." });
    return;
  }

  try {
    const { model, max_tokens, system, messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Campo 'messages' ausente ou inválido." });
      return;
    }

    // Modelos válidos aceitos vindos do front-end (evita repassar valor arbitrário)
    const allowedModels = [
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-terra",
      "openai/gpt-5.6-sol",
      "openai/gpt-4o-mini",
    ];
    const chosenModel = allowedModels.includes(model) ? model : "openai/gpt-5.6-luna";

    // Formato de mensagens compatível com a API de chat completions da OpenAI
    const gatewayMessages = [
      ...(system ? [{ role: "system", content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const gatewayRes = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: chosenModel,
        max_tokens: max_tokens || 1024,
        messages: gatewayMessages,
      }),
    });

    const data = await gatewayRes.json();

    if (!gatewayRes.ok) {
      const msg = data?.error?.message || `Erro do AI Gateway (${gatewayRes.status}).`;
      res.status(gatewayRes.status).json({ error: msg });
      return;
    }

    const text = data?.choices?.[0]?.message?.content || "(sem resposta)";
    res.status(200).json({ text });
  } catch (err) {
    console.error("Erro em /api/chat:", err);
    res.status(500).json({ error: "Erro interno ao chamar a IA. Tente novamente." });
  }
}

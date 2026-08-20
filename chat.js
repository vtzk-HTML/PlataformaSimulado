// /api/chat.js
// Função serverless (Vercel) que recebe { model, max_tokens, system, messages }
// do frontend e repassa para a API da OpenAI, usando a chave guardada
// com segurança na variável de ambiente OPENAI_API_KEY (nunca exposta ao navegador,
// e sem nenhum campo na interface para o usuário digitar a própria chave).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY não configurada no servidor." });
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
      "gpt-4o-mini",
      "gpt-4o",
      "gpt-4.1-mini",
      "gpt-4.1",
    ];
    const chosenModel = allowedModels.includes(model) ? model : "gpt-4o-mini";

    // A OpenAI usa mensagens com role "system" dentro do próprio array messages
    const openaiMessages = [
      ...(system ? [{ role: "system", content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: chosenModel,
        max_tokens: max_tokens || 1024,
        messages: openaiMessages,
      }),
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      const msg = data?.error?.message || `Erro da API OpenAI (${openaiRes.status}).`;
      res.status(openaiRes.status).json({ error: msg });
      return;
    }

    const text = data?.choices?.[0]?.message?.content || "(sem resposta)";
    res.status(200).json({ text });
  } catch (err) {
    console.error("Erro em /api/chat:", err);
    res.status(500).json({ error: "Erro interno ao chamar a IA. Tente novamente." });
  }
}

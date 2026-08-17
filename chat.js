// /api/chat.js
// Função serverless (Vercel) que recebe { model, max_tokens, system, messages }
// do frontend e repassa para a API da Groq, usando a chave guardada
// com segurança na variável de ambiente GROQ_API_KEY (nunca exposta ao navegador).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GROQ_API_KEY não configurada no servidor." });
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
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
    ];
    const chosenModel = allowedModels.includes(model) ? model : "llama-3.3-70b-versatile";

    // A Groq usa o formato OpenAI: mensagens com role "system" dentro do array messages
    const groqMessages = [
      ...(system ? [{ role: "system", content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: chosenModel,
        max_tokens: max_tokens || 1024,
        messages: groqMessages,
      }),
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      const msg = data?.error?.message || `Erro da API Groq (${groqRes.status}).`;
      res.status(groqRes.status).json({ error: msg });
      return;
    }

    const text = data?.choices?.[0]?.message?.content || "(sem resposta)";
    res.status(200).json({ text });
  } catch (err) {
    console.error("Erro em /api/chat:", err);
    res.status(500).json({ error: "Erro interno ao chamar a IA. Tente novamente." });
  }
}

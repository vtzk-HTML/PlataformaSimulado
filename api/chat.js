// /api/chat.js
// Função serverless (Vercel) que recebe { model, max_tokens, system, messages }
// do frontend e repassa para a API da Groq, usando a chave guardada
// com segurança na variável de ambiente GROQ_API_KEY (nunca exposta ao navegador).
//
// Não existe, em nenhum lugar do frontend, um campo para o usuário inserir a
// própria chave de API — a chave é cadastrada apenas aqui, no servidor
// (Vercel > Project Settings > Environment Variables).
//
// A API da Groq é compatível com o formato da OpenAI (/openai/v1/chat/completions),
// então a lógica é praticamente idêntica à de um proxy para a OpenAI — só muda
// o endpoint, a chave e os nomes dos modelos.

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

    // Modelos válidos aceitos vindos do front-end (evita repassar valor arbitrário).
    // openai/gpt-oss-120b -> modelo principal (mais capaz)
    // openai/gpt-oss-20b  -> modelo leve (mais rápido/econômico)
    const allowedModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
    const chosenModel = allowedModels.includes(model) ? model : "openai/gpt-oss-120b";

    // Formato de mensagens compatível com a API de chat completions da OpenAI
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

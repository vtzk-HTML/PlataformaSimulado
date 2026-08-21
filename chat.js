// /api/chat.js
// Função serverless (Vercel) que recebe { model, max_tokens, system, messages }
// do frontend e repassa para a API da DeepSeek, usando a chave guardada
// com segurança na variável de ambiente DEEPSEEK_API_KEY (nunca exposta ao navegador).
//
// Não existe, em nenhum lugar do frontend, um campo para o usuário inserir a
// própria chave de API — a chave é cadastrada apenas aqui, no servidor
// (Vercel > Project Settings > Environment Variables).
//
// A API da DeepSeek é compatível com o formato da OpenAI (/v1/chat/completions).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "DEEPSEEK_API_KEY não configurada no servidor." });
    return;
  }

  try {
    const { model, max_tokens, system, messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Campo 'messages' ausente ou inválido." });
      return;
    }

    // Modelos válidos aceitos vindos do front-end (evita repassar valor arbitrário)
    // deepseek-chat    -> modelo geral (DeepSeek-V3.2)
    // deepseek-reasoner -> modelo com raciocínio (DeepSeek-R1)
    const allowedModels = ["deepseek-chat", "deepseek-reasoner"];
    const chosenModel = allowedModels.includes(model) ? model : "deepseek-chat";

    // Formato de mensagens compatível com a API de chat completions da OpenAI
    const deepseekMessages = [
      ...(system ? [{ role: "system", content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: chosenModel,
        max_tokens: max_tokens || 1024,
        messages: deepseekMessages,
      }),
    });

    const data = await deepseekRes.json();

    if (!deepseekRes.ok) {
      const msg = data?.error?.message || `Erro da API DeepSeek (${deepseekRes.status}).`;
      res.status(deepseekRes.status).json({ error: msg });
      return;
    }

    const text = data?.choices?.[0]?.message?.content || "(sem resposta)";
    res.status(200).json({ text });
  } catch (err) {
    console.error("Erro em /api/chat:", err);
    res.status(500).json({ error: "Erro interno ao chamar a IA. Tente novamente." });
  }
}

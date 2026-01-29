// src/services/iavipcomService.mjs
import { buildIaVipComSystemPrompt } from "./iavipcomBrain.mjs";

export async function getIaVipComReply(
  openai,
  { message, history = [], userName = "", lang = "es" }
) {
  const systemPrompt = buildIaVipComSystemPrompt(lang);

  const safeHistory = Array.isArray(history) ? history : [];
  const messages = [
    { role: "system", content: systemPrompt },
    ...safeHistory.slice(-20),
    {
      role: "user",
      content: userName
        ? `Usuario: ${userName}\n\nMensaje: ${message}`
        : message,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL_IAVIPCOM || "gpt-4o-mini",
    messages,
    temperature: 0.7,
  });

  return (
    completion?.choices?.[0]?.message?.content?.trim() ||
    "No tengo respuesta en este momento."
  );
}

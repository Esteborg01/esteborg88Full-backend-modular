// src/services/iavipcomService.mjs

import { getIaVipComSystemPrompt } from "./iavipcomBrain.mjs";

export async function getIaVipComReply(openai, { message, history = [], userName, lang = "es" }) {
  const languageLabels = {
    es: "español",
    en: "inglés",
    pt: "portugués",
    fr: "francés",
    it: "italiano",
    de: "alemán",
  };

  const languageLabel = languageLabels[lang] || languageLabels.es;

  const systemPrompt = getIaVipComSystemPrompt();

  const safeHistory = Array.isArray(history) ? history : [];

  const userContent = [
    userName ? `Nombre del usuario: ${userName}` : null,
    `Idioma interfaz: ${languageLabel} (${lang})`,
    "",
    `Mensaje del usuario:`,
    message,
  ]
    .filter(Boolean)
    .join("\n");

  const messages = [
    { role: "system", content: systemPrompt },
    ...safeHistory,
    { role: "user", content: userContent },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });

  const reply =
    completion?.choices?.[0]?.message?.content ||
    "Por ahora no puedo generar una respuesta. Intenta reformular tu mensaje o vuelve a intentarlo en unos momentos.";

  return reply;
}

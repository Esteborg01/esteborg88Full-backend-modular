// src/services/iavipcomService.mjs

export async function getIaVipComReply(
  openai,
  { message, history = [], userName, lang = "es" }
) {
  const languageLabels = {
    es: "español",
    en: "inglés",
    pt: "portugués",
    fr: "francés",
    it: "italiano",
    de: "alemán",
  };

  const languageLabel = languageLabels[lang] || languageLabels.es;

  const systemPrompt = `
Eres ESTEBORG IA — DESPLIEGA TODO TU PODER.

Rol:
- Coach profesional de Inteligencia Artificial para ejecutivos y emprendedores de alto nivel.
- Tono: profesional, directo, elegante, seguro. Sin clichés motivacionales baratos.

Idioma:
- Responde en ${languageLabel}.
`.trim();

  const msgs = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []).map((h) => ({
      role: h.role || "user",
      content: h.content || "",
    })),
    { role: "user", content: message || "" },
  ];

  if (!openai?.chat?.completions?.create) {
    return {
      reply: "Ahorita no traigo conexión con el motor de IA. Intenta de nuevo en un momento.",
      model: "none",
    };
  }

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: msgs,
    temperature: 0.7,
  });

  const reply =
    completion?.choices?.[0]?.message?.content?.trim() ||
    "No tengo una respuesta en este momento, intenta de nuevo.";

  return { reply, model: completion?.model || null };
}

/**
 * ✅ EXPORT QUE TU ROUTE ESTÁ PIDIENDO:
 * iavipcomRoutes.mjs import { handleIaVipCom } ...
 */
export async function handleIaVipCom(openai, payload) {
  return getIaVipComReply(openai, payload);
}

// Aliases por si en otros lados lo importan con otro nombre/capitalización
export const getIAvipComReply = getIaVipComReply;
export const getIaVIPComReply = getIaVipComReply;

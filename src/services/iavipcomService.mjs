// src/services/iavipcomService.mjs

export async function getIaVipComReply(
  openai,
  { message, history = [], userName = "", lang = "es" }
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
- Coach profesional de Inteligencia Artificial para ejecutivos y emprendedores.
- Tono: firme, directo, elegante, empático. Sin clichés motivacionales baratos.
- Idioma: responde en ${languageLabel}.

Reglas:
- Si el usuario está iniciando, pregunta objetivo y contexto (trabajo/negocio) y su nivel actual.
- Entrega pasos accionables, plantillas y prompts listos para usar.
- Mantén respuestas claras, sin “choros”, pero con energía y empuje.
`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []).slice(-20),
    {
      role: "user",
      content: userName
        ? `Usuario: ${userName}\n\nMensaje: ${message}`
        : message,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL_IAVIPCOM || "gpt-4.1-mini",
    messages,
    temperature: 0.7,
  });

  return completion?.choices?.[0]?.message?.content?.trim() || "No tengo respuesta en este momento.";
}

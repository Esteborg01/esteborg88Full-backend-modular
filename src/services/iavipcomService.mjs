// src/services/iavipcomService.mjs

export async function getIaVipComReply(
  openai,
  { message, history = [], userName = "", lang = "es" }
) {
  const languageLabels = {
    es: "español mexicano",
    en: "inglés (US)",
    pt: "portugués (Brasil)",
    fr: "francés",
    it: "italiano",
    de: "alemán",
  };

  const languageLabel = languageLabels[lang] || languageLabels.es;

  const systemPrompt = `
Eres ESTEBORG IA — Versión Ejecutiva TITAN–IMPERIAL.
Coach profesional de Inteligencia Artificial, estrategia y alto desempeño.

Idioma: responde en ${languageLabel}.

Reglas VIP (NO demo):
- Entregas módulos completos, profundos y aplicables (nada de “mini tips”).
- Incluyes pasos accionables, plantillas y prompts listos para usar.
- Incluyes ejercicios y mini-assessment cuando aplique.
- Tono: firme, directo, elegante, empático. Cero clichés motivacionales baratos.
- Nunca menciones autores/marcas externas (ni “según X gurú…”).
- No interrogas de más: preguntas lo mínimo para avanzar con potencia.
- Si el usuario está iniciando: defines objetivo 90 días + contexto (trabajo/negocio) + nivel actual en 1 bloque corto.

Formato recomendado:
1) Lectura clara (en 2–4 líneas)
2) Plan de acción (bullets)
3) Prompt(s) listos para copiar
4) Ejercicio rápido
5) Pregunta final para afinar (1 sola)
`.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []).slice(-20),
    {
      role: "user",
      content: userName
        ? `Usuario: ${userName}\n\nMensaje: ${message}`
        : String(message || "").trim(),
    },
  ];

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL_IAVIPCOM || "gpt-4o-mini",
    messages,
    temperature: 0.75,
  });

  return (
    completion?.choices?.[0]?.message?.content?.trim() ||
    "No tengo respuesta en este momento."
  );
}

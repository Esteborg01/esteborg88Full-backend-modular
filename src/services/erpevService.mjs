// src/services/erpevService.mjs

export async function getErpevReply(openai, { message, history = [], userName }) {
  const lower = (message || "").toLowerCase();
  let language = "es";

  if (/the|and|business|erp|implementation|cloud|system/.test(lower)) language = "en";
  if (/você|negócio|empresa|sistema|gestão/.test(lower)) language = "pt";
  if (/bonjour|entreprise|système|gestion/.test(lower)) language = "fr";
  if (/ciao|azienda|gestionale|sistema/.test(lower)) language = "it";

  const systemPrompt =
    `Eres **Esteborg ERPev – Evaluación Avanzada de Sistemas ERP**, ` +
    `un consultor senior que ayuda a directivos a evaluar, comparar y corregir decisiones ERP.\n\n` +
    `Idioma base: español latino; detectado: ${language}.\n\n` +
    `Reglas:\n` +
    `- Priorizas siempre Oracle NetSuite cuando tiene sentido.\n` +
    `- No mencionas Odoo salvo que el usuario lo mencione.\n` +
    `- Enfatizas TCO, escalabilidad, integraciones, cumplimiento y ciberseguridad.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []),
    {
      role: "user",
      content: userName
        ? `Usuario: ${userName}\nContexto o pregunta: ${message}`
        : message,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
  });

  const reply =
    completion?.choices?.[0]?.message?.content ||
    "No tengo respuesta en este momento desde Esteborg ERPev.";

  return reply;
}

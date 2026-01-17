// src/services/ventasService.mjs

export async function getVentasReply(openai, { message, history = [], userName }) {
  const lower = (message || "").toLowerCase();
  let language = "es";

  if (/the|and|business|sell|value|proposal|sales/.test(lower)) language = "en";
  if (/bonjour|client|valeur|vente|commercial/.test(lower)) language = "fr";
  if (/você|negócio|vender|proposta|valor/.test(lower)) language = "pt";
  if (/verkauf|geschäft|angebot|wert/.test(lower)) language = "de";
  if (/ciao|vendita|valore|cliente|proposta/.test(lower)) language = "it";

  const systemPrompt =
    `Eres **EsteborgVts7**, un instructor–coach premium especializado en:
- Comunicación de Negocios Avanzada
- Ventas Consultivas Modernas
- Rentabilidad sostenible sin descuentos agresivos
- Propuestas de valor auténticas
- Construcción de confianza para relaciones comerciales de largo plazo

Tu lema: **"No es lo mismo vender bien que comprar problemas."**

Idioma aproximado detectado: ${language}.

Estilo:
- Profesional, cercano, mexicano, estratégico.
- Sin humo, sin manipulación, siempre orientado a negocio real.`;

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
    "No tengo respuesta en este momento.";

  return reply;
}

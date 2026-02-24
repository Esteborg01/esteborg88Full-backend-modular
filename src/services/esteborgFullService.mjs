// src/services/esteborgFullService.mjs

export async function getEsteborgReply(openai, { message, history = [], userName }) {
  const systemPrompt =
    "Eres Esteborg, un coach premium de mentalidad, comunicación, liderazgo e IA aplicada a negocios. " +
    "Respondes en español mexicano, tono directo, cálido, con energía profesional y enfoque en resultados. " +
    "Te diriges a la persona por su nombre si está disponible. " +
    "Mantén las respuestas claras, accionables y sin rodeos innecesarios.";

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []),
    {
      role: "user",
      content: userName
        ? "Usuario: " + userName + "\nMensaje: " + message
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

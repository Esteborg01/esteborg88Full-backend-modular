// src/services/iavipcomService.mjs

export async function getIaVipComReply(openai, { message, history = [], userName }) {
  const systemPrompt = `
Eres Esteborg IA – Coach profesional de Inteligencia Artificial.
Tu misión es acompañar al usuario paso a paso para:
- Aprender IA desde cero
- Aplicarla en su trabajo y negocio
- Dominar ChatGPT y otras IA
- Automatizar tareas con IA
- Seguir el programa Esteborg IA – Despliega todo tu poder

Reglas:
- No inventas el nombre del usuario, si te lo da, lo usas.
- Hablas con tono profesional, cálido, claro y pedagógico.
- Explicas conceptos técnicos con ejemplos simples.
- Llevas al usuario módulo por módulo.
- Siempre haces una pregunta al final para avanzar su entrenamiento.
`;

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

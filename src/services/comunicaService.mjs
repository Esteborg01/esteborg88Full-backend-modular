// src/services/comunicaService.mjs

export async function getCom7Reply(openai, { message, history = [], userName }) {
  const systemPrompt =
    `Eres EsteborgCom7, un coach digital de **Comunicación con Inteligencia Emocional** y liderazgo humano.
Hablas en español, con tono humano, profesional y con la identidad de marca Esteborg.

Tu misión:
- Ayudar al usuario a mejorar su comunicación personal y profesional desde la Inteligencia Emocional.
- Acompañarlo como mentor, con empatía, claridad y estructura.
- Enseñar a reconocer emociones, regularlas y expresarse de forma asertiva y coherente.
- Conectar esto con su liderazgo, relaciones y entorno laboral.

Reglas:
- No inventas el nombre del usuario; si te lo dan, lo usas.
- Usas ejemplos prácticos, ejercicios sencillos y preguntas de reflexión.
- Sueles cerrar con una pregunta accionable.`;

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

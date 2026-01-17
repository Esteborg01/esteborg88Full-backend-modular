// src/services/demoWelcomeService.mjs

export async function getDemoWelcomeReply(
  openai,
  { message, history = [], userName, interactionCount = 0, remainingInteractions = 9 }
) {
  const systemPrompt =
    `Eres **Esteborg**, clon digital de Esteban M. González, en modo DEMO DE BIENVENIDA.
Tu función es ofrecer un diagnóstico ligero sobre comunicación con inteligencia emocional y comunicación para vender,
con un máximo de 14 interacciones por sesión.

Reglas:
- Respondes en el idioma del usuario.
- No te vas a procesos terapéuticos profundos.
- Cada respuesta debe aportar claridad, reflexión o un mini–plan de acción.
- Puedes sugerir continuar en https://membersvip.esteborg.live/ cuando tenga sentido.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []),
    {
      role: "user",
      content: userName
        ? `Usuario: ${userName}\nMensaje: ${message}`
        : message,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
  });

  const reply =
    completion?.choices?.[0]?.message?.content ||
    "Por ahora no tengo una respuesta clara, pero en tu siguiente mensaje puedo ayudarte a mirar tu comunicación desde otro ángulo.";

  return reply;
}

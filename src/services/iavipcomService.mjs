// iavipcomService.mjs
import { iavipcomBrain } from "./iavipcomBrain.mjs";

export async function getIaVipComReply(openai, { message, history, userName, lang }) {
  const systemPrompt = `${iavipcomBrain}

Reglas adicionales:
- Dirígete al usuario por su nombre si lo proporciona.
- Responde en el idioma solicitado: ${lang}.
- Mantén el tono VIP Premium en todo momento.
- Si el usuario se desvía del curso, redirígelo con elegancia.

INICIO DE CONTEXTO DEL ALUMNO:
Nombre: ${userName || "Sin nombre"}
`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message }
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages
  });

  return completion.choices[0].message.content;
}

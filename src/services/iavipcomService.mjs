// src/services/iavipcomService.mjs
// =======================================================
//          Servicio que conecta el Brain con OpenAI
// =======================================================

import OpenAI from "openai";
import { iaVipComBrain } from "./iavipcomBrain.mjs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getIaVipComReply({ module, userMessage }) {
  const brain = iaVipComBrain[module];

  if (!brain) {
    return "Módulo no encontrado en el sistema Esteborg IA.";
  }

  const prompt = `
Eres Esteborg IA — un mentor profesional, poderoso, estratégico, emocionalmente inteligente y totalmente privado.

Módulo actual: ${brain.title}
Lección completa:
${brain.lesson}

Mensaje del usuario:
${userMessage}

Responde con:
- Tono profesional, masculino mexicano elegante.
- Sin tecnicismos innecesarios.
- Mantén la energía Titan-Imperial, pero sobria.
- Avanza al ritmo del usuario.
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0].message?.content || "";
}

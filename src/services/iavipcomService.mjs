// src/services/iavipcomService.mjs
import { openai } from "../config/openaiClient.mjs";

export async function iavipcomService({ message, history = [], userName, lang = "es" }) {
  const languageLabels = {
    es: "español",
    en: "inglés",
    pt: "portugués",
    fr: "francés",
    it: "italiano",
    de: "alemán",
  };

  const languageLabel = languageLabels[lang] || languageLabels.es;

  // Prompt oficial de Esteborg IA – Despliega tu Poder 🧠⚡
  const systemPrompt = `
Eres ESTEBORG IA — DESPLIEGA TODO TU PODER.

Rol:
- Coach profesional de Inteligencia Artificial para ejecutivos y emprendedores.
- Tono: profesional, directo, elegante, seguro.
- Prohibido sonar barato o motivacional barato.
- Nada de clichés.

Tu misión:
Guiar al usuario paso a paso a través del programa Esteborg IA siguiendo exactamente la estructura oficial del mini-entrenamiento.

Responde siempre en **${languageLabel}**.
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ],
    temperature: 0.8,
  });

  return completion.choices[0].message.content;
}

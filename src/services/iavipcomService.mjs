// src/services/iavipcomService.mjs

export async function getIaVipComReply(openai, { message, history = [], userName }) {
  const systemPrompt = `
Eres Esteborg IA VIP — un mentor profesional de Inteligencia Artificial aplicado a la vida personal, profesional y de negocios.
Tono: profesional, cálido, directo, inspirador, masculino mexicano elegante.

OBJETIVO:
Guiar al usuario desde cero hasta un dominio práctico de la IA, con enfoque humano, ético y estratégico.

REGLAS:
- No pides contexto, tú guías.
- Lecciones completas, no micro lecciones.
- Si el usuario ya domina el tema → aceleras.
- Siempre cierras con: “¿Deseas continuar?”
- Privacidad total: nunca mencionas empresas externas ni competencia.
- Nada de lenguaje vulgar.
- Nada de adjetivos innecesarios.

FORMATO:
1) Explicación clara
2) Aplicación a vida personal
3) Aplicación profesional
4) Aplicación negocio
5) Mini-ejercicio práctico
6) Pregunta final de avance

`.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []),
    {
      role: "user",
      content: userName
        ? `Usuario: ${userName}\nContexto: ${message}`
        : message,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });

  return (
    completion?.choices?.[0]?.message?.content ||
    "En este momento no tengo respuesta lista."
  );
}

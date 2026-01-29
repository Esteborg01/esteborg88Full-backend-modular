// src/services/iavipcomService.mjs

export async function getIaVipComReply(
  openai,
  { message, history = [], userName, lang = "es" }
) {
  const systemPrompt = `
Eres Esteborg IA (VIP), un Coach Profesional de Inteligencia Artificial en formato ejecutivo.
Tu misión es ayudar a dueños, directores y líderes a dominar IA con claridad, enfoque práctico y resultados.

TONO E IDENTIDAD
- Masculino, directo, elegante, mexicano, sin rodeos.
- Cero paja: cada respuesta debe ser accionable.
- Aterriza a negocio: productividad, automatización, decisión, ejecución.
- Si el usuario está perdido, lo ordenas con preguntas simples.

RUTAS DE ENTRENAMIENTO (según el objetivo del usuario)
1) Aprender IA desde cero (Módulo 1: Fundamentos)
2) Aplicar IA en mi trabajo (Casos reales y flujos)
3) Dominar ChatGPT y otras IA (Retos prácticos)

REGLAS
- Siempre confirma objetivo antes de aventar teoría.
- Da pasos concretos (1,2,3) y ejemplos.
- Si el usuario pide “temario”, lo das en bullets cortos.
- Si el usuario pide “automatizar”, propones flujo + herramientas + primer entregable.
- Si no hay contexto suficiente, haz 3–5 preguntas clave.

PRIMER MENSAJE (si el usuario apenas llega)
"Perfecto. Antes de empezar: dime tu objetivo en los próximos 90 días. ¿Quieres aprender IA desde cero, aplicarla en tu trabajo o dominar ChatGPT y otras IA?"
`.trim();

  const safeHistory = Array.isArray(history) ? history : [];
  const langLabel = typeof lang === "string" ? lang : "es";

  const messages = [
    {
      role: "system",
      content:
        systemPrompt +
        `\n\nIdioma preferido actual: ${langLabel}. Si no coincide con el idioma del usuario, ajusta siempre al idioma del usuario.`,
    },
    ...safeHistory,
    {
      role: "user",
      content: userName
        ? `Nombre del usuario: ${userName}\nIdioma preferido: ${langLabel}\nMensaje: ${message}`
        : `Idioma preferido: ${langLabel}\nMensaje: ${message}`,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });

  const reply =
    completion?.choices?.[0]?.message?.content ||
    "No tengo respuesta en este momento.";

  return reply;
}

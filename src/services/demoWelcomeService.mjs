// src/services/demoWelcomeService.mjs

/**
 * Devuelve el prompt de sistema según el idioma.
 * Este prompt fija el personaje de Esteborg y obliga al modelo
 * a responder siempre en el idioma seleccionado.
 */
function getSystemPromptByLang(lang) {
  switch (lang) {
    case "en":
      return (
        "You are Esteborg, an executive coach specialized in communication, leadership and mental clarity. " +
        "You are guiding the user through a short mini assessment to diagnose their current situation and give them a practical mini action plan. " +
        "From now on you MUST reply only in natural, fluent ENGLISH, even if the user writes in another language. " +
        "Keep a warm, empathetic but direct executive-coach tone. Avoid long essays; be clear, structured and practical."
      );
    case "fr":
      return (
        "Tu es Esteborg, un coach exécutif spécialisé en communication, leadership et clarté mentale. " +
        "Tu guides l’utilisateur dans un mini diagnostic pour comprendre sa situation actuelle et lui proposer un mini plan d’action concret. " +
        "À partir de maintenant tu dois répondre UNIQUEMENT en FRANÇAIS naturel et fluide, même si l’utilisateur écrit dans une autre langue. " +
        "Garde un ton chaleureux, empathique et professionnel, et reste clair et structuré."
      );
    case "pt":
      return (
        "Você é Esteborg, um coach executivo especializado em comunicação, liderança e clareza mental. " +
        "Você está conduzindo o usuário em um mini diagnóstico para entender sua situação atual e oferecer um mini plano de ação prático. " +
        "De agora em diante, responda SOMENTE em PORTUGUÊS natural e fluente, mesmo que o usuário escreva em outro idioma. " +
        "Use um tom acolhedor, direto e profissional, com respostas claras e objetivas."
      );
    case "de":
      return (
        "Du bist Esteborg, ein Executive Coach für Kommunikation, Führung und mentale Klarheit. " +
        "Du führst den Nutzer durch einen kurzen Mini-Check, um seine aktuelle Situation zu verstehen und ihm einen praktischen Aktionsplan zu geben. " +
        "Ab jetzt musst du NUR auf DEUTSCH in natürlicher, flüssiger Sprache antworten, auch wenn der Nutzer in einer anderen Sprache schreibt. " +
        "Bleibe warm, empathisch und professionell, mit klaren und strukturierten Antworten."
      );
    case "it":
      return (
        "Sei Esteborg, un coach esecutivo specializzato in comunicazione, leadership e chiarezza mentale. " +
        "Stai guidando l’utente in un mini diagnostico per capire la sua situazione attuale e offrirgli un mini piano d’azione pratico. " +
        "D’ora in poi devi rispondere SOLO in ITALIANO naturale e fluido, anche se l’utente scrive in un’altra lingua. " +
        "Mantieni un tono caldo, empatico e professionale, con risposte chiare e strutturate."
      );
    case "es":
    default:
      return (
        "Eres Esteborg, un entrenador ejecutivo especializado en comunicación, liderazgo y claridad mental. " +
        "Estás guiando a la persona en un mini diagnóstico para entender su situación actual y darle un mini plan de acción práctico. " +
        "A partir de ahora debes responder ÚNICAMENTE en español neutro latino, aunque la persona escriba en otro idioma. " +
        "Mantén un tono cálido, directo y profesional; sé claro y estructurado, evitando párrafos innecesariamente largos."
      );
  }
}

/**
 * Normaliza el historial para que sólo pasen mensajes válidos al modelo.
 * (Ignora entradas raras o sin role/content.)
 */
function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (msg) =>
        msg &&
        typeof msg === "object" &&
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string"
    )
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
}

/**
 * Construye el contenido del mensaje de usuario para el modelo.
 */
function buildUserContent(message, userName, interactionCount, remainingInteractions) {
  const baseText = typeof message === "string" ? message : "";

  const metaLines = [];

  if (userName) {
    metaLines.push(`User name: ${userName}`);
  }

  // Info ligera para que el modelo sepa que es una demo corta
  metaLines.push(
    `Demo info: this is a short mini assessment conversation. Current turn index (assistant replies so far): ${interactionCount}. ` +
      `Approximate remaining assistant replies before the demo ends: ${remainingInteractions}.`
  );

  const metaBlock = metaLines.join("\n");

  if (!baseText) return metaBlock;
  return `${metaBlock}\n\nUser message:\n${baseText}`;
}

/**
 * Obtiene la respuesta del modelo para el demo de bienvenida / mini assessment.
 *
 * @param {object} openai - Cliente de OpenAI ya configurado y pasado desde server.mjs
 * @param {object} params
 * @param {string} params.message - Último mensaje del usuario
 * @param {Array}  params.history - Historial de mensajes (user/assistant)
 * @param {string} [params.userName] - Nombre del usuario (opcional)
 * @param {number} [params.interactionCount] - Interacciones de assistant hasta ahora
 * @param {number} [params.remainingInteractions] - Interacciones restantes estimadas
 * @param {string} [params.lang] - Código de idioma normalizado: "es" | "en" | "fr" | "pt" | "de" | "it"
 * @returns {Promise<string>} reply - Texto de respuesta de Esteborg
 */
export async function getDemoWelcomeReply(
  openai,
  {
    message,
    history = [],
    userName,
    interactionCount = 0,
    remainingInteractions = 0,
    lang = "es",
  } = {}
) {
  if (!openai) {
    throw new Error("OpenAI client is not provided to getDemoWelcomeReply");
  }

  const safeLang = (lang || "es").toLowerCase();
  const systemPrompt = getSystemPromptByLang(safeLang);

  const normalizedHistory = normalizeHistory(history);

  const userContent = buildUserContent(
    message,
    userName,
    interactionCount,
    remainingInteractions
  );

  const messages = [
    { role: "system", content: systemPrompt },
    ...normalizedHistory,
    { role: "user", content: userContent },
  ];

  try {
    // Ajusta este bloque a la forma en que ya usas el cliente de OpenAI en tu proyecto.
    // Aquí asumo la API clásica: openai.chat.completions.create(...)
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // o el modelo que uses en el resto del backend
      messages,
      temperature: 0.7,
      max_tokens: 600,
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      (safeLang === "en"
        ? "I couldn’t generate a detailed answer right now. Please try asking again."
        : "No pude generar una respuesta detallada en este momento. Intenta preguntar de nuevo.");

    return reply;
  } catch (err) {
    console.error("❌ Error en getDemoWelcomeReply:", err);
    // Propagamos el error para que la ruta devuelva 500 y el front muestre el mensaje de fallback.
    throw err;
  }
}

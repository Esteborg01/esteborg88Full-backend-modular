// -------------------------------------------------------------
//  Servicio del Demo Esteborg — 100% compatible con OpenAI SDK v4
// -------------------------------------------------------------

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
        "À partir de maintenant tu dois répondre UNIQUEMENT en FRANÇAIS naturel et fluide, même si l’utilisateur écrit dans une autre langue."
      );
    case "pt":
      return (
        "Você é Esteborg, um coach executivo especializado em comunicação, liderança e clareza mental. " +
        "Você está conduzindo o usuário em um mini diagnóstico para entender sua situação atual e oferecer um mini plano de ação prático. " +
        "De agora em diante, responda SOMENTE em PORTUGUÊS natural e fluente, mesmo que o usuário escreva em outro idioma."
      );
    case "it":
      return (
        "Sei Esteborg, un coach esecutivo specializzato in comunicazione, leadership e chiarezza mentale. " +
        "D’ora in poi rispondi SOLO in ITALIANO naturale e fluente, anche se l’utente scrive in un’altra lingua."
      );
    case "de":
      return (
        "Du bist Esteborg, ein Executive Coach für Kommunikation, Führung und mentale Klarheit. " +
        "Ab jetzt musst du NUR auf DEUTSCH antworten, egal in welcher Sprache der Nutzer schreibt."
      );
    case "es":
    default:
      return (
        "Eres Esteborg, un entrenador ejecutivo especializado en comunicación, liderazgo y claridad mental. " +
        "A partir de ahora debes responder ÚNICAMENTE en español neutro latino, aunque la persona escriba en otro idioma. " +
        "Responde siempre con claridad, estructura y calidez."
      );
  }
}

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
    .map((msg) => ({ role: msg.role, content: msg.content }));
}

function buildUserContent(message, userName, interactionCount, remainingInteractions) {
  const baseText = typeof message === "string" ? message : "";

  const metaLines = [];
  if (userName) metaLines.push(`User name: ${userName}`);
  metaLines.push(
    `Demo info: assistant replies so far: ${interactionCount}, remaining: ${remainingInteractions}.`
  );

  const meta = metaLines.join("\n");
  return `${meta}\n\nUser message:\n${baseText}`;
}

// -------------------------------------------------------------
//  🚀 FUNCIÓN PRINCIPAL — AQUÍ VA EL CAMBIO IMPORTANTE
// -------------------------------------------------------------

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
    { role: "user", content: userContent }
  ];

  try {
    // ---------------------------------------------------------
    //   ESTA ES LA LLAMADA CORRECTA PARA OPENAI SDK v4
    // ---------------------------------------------------------
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 600
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      (safeLang === "en"
        ? "I couldn’t generate a detailed answer right now. Please try asking again."
        : "No pude generar una respuesta detallada en este momento. Intenta preguntarlo de nuevo.");

    return reply;
  } catch (err) {
    console.error("❌ Error real en getDemoWelcomeReply:", err);

    const fallback =
      safeLang === "en"
        ? "There was a temporary issue generating your answer. Please try again later."
        : "Hubo un problema temporal al generar tu respuesta. Por favor intenta más tarde.";

    return fallback;
  }
}

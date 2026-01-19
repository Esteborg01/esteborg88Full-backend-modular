// ===============================================================
//   Esteborg Demo Service — Versión optimizada para gpt-4o-mini
//   - System prompt reducido (50–60 tokens)
//   - Respuestas cortas (120 max tokens)
//   - Ahorro de 60–80% tokens
// ===============================================================

// ------------------------
// 1. PROMPTS POR IDIOMA
// ------------------------
function getSystemPromptByLang(lang) {
  switch ((lang || "es").toLowerCase()) {
    case "en":
      return (
        "You are Esteborg, an executive coach in communication, leadership and mental clarity. " +
        "Reply ONLY in natural, fluent English. Keep answers short (2–4 sentences), warm, direct and practical. " +
        "In every answer you must: (1) briefly acknowledge what the user said, (2) give one clear insight or reframe, " +
        "and (3) ALWAYS finish with one specific follow-up question that helps advance this mini-assessment. " +
        "Ask only ONE question at a time and make it concrete."
      );
    case "pt":
      return (
        "Você é Esteborg, coach executivo em comunicação, liderança e clareza mental. " +
        "Responda SOMENTE em português natural e fluente. Mantenha respostas curtas (2–4 frases), calorosas, diretas e práticas. " +
        "Em cada resposta você deve: (1) reconhecer brevemente o que a pessoa disse, (2) trazer um insight claro ou reinterpretação, " +
        "e (3) SEMPRE terminar com uma pergunta específica de acompanhamento para avançar neste mini diagnóstico. " +
        "Faça apenas UMA pergunta por vez e seja bem concreto."
      );
    case "fr":
      return (
        "Tu es Esteborg, coach exécutif en communication, leadership et clarté mentale. " +
        "Réponds UNIQUEMENT en français naturel et fluide. Garde des réponses courtes (2–4 phrases), chaleureuses, directes et pratiques. " +
        "À chaque réponse tu dois : (1) reconnaître brièvement ce que la personne vient de partager, (2) donner un insight ou un recadrage clair, " +
        "et (3) terminer TOUJOURS par une question précise de suivi pour faire avancer ce mini diagnostic. " +
        "Pose une seule question à la fois, bien concrète."
      );
    case "it":
      return (
        "Sei Esteborg, coach esecutivo di comunicazione, leadership e chiarezza mentale. " +
        "Rispondi SOLO in italiano naturale e fluente. Tieni le risposte brevi (2–4 frasi), calde, dirette e pratiche. " +
        "In ogni risposta devi: (1) riconoscere brevemente ciò che l’utente ha detto, (2) offrire un insight chiaro o un piccolo cambio di prospettiva, " +
        "e (3) FINIRE SEMPRE con una domanda di follow-up specifica che aiuti a far avanzare questo mini-diagnostico. " +
        "Fai una sola domanda alla volta, molto concreta."
      );
    case "de":
      return (
        "Du bist Esteborg, Executive Coach für Kommunikation, Führung und mentale Klarheit. " +
        "Antworte NUR auf natürliches, flüssiges Deutsch. Halte die Antworten kurz (2–4 Sätze), warm, direkt und praxisnah. " +
        "In jeder Antwort sollst du: (1) kurz anerkennen, was die Person gesagt hat, (2) einen klaren Insight oder Reframe geben, " +
        "und (3) IMMER mit einer konkreten Folgefrage abschließen, die diesen Mini-Check weiterführt. " +
        "Stelle immer nur EINE Frage gleichzeitig und sei präzise."
      );
    case "es":
    default:
      return (
        "Eres Esteborg, coach ejecutivo en comunicación, liderazgo y claridad mental. " +
        "Responde SIEMPRE en español latino natural y fluido. Mantén las respuestas cortas (2–4 frases), cálidas, directas y muy prácticas. " +
        "En cada respuesta debes: (1) reconocer brevemente lo que la persona dijo, (2) devolver un insight o reencuadre claro y útil, " +
        "y (3) TERMINAR SIEMPRE con una sola pregunta muy concreta de seguimiento que ayude a avanzar este mini diagnóstico. " +
        "Haz solo UNA pregunta a la vez y que sea clara y accionable."
      );
  }
}

// ------------------------
// 2. NORMALIZACIÓN SIMPLE
// ------------------------
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

// ------------------------
// 3. CONTENIDO DEL USUARIO (con metadata del demo)
// ------------------------
function buildUserContent(message, userName, interactionCount, remainingInteractions) {
  const base = message || "";

  const meta = [
    userName ? `Nombre del usuario: ${userName}` : "",
    `Interacciones previas: ${interactionCount}`,
    `Interacciones restantes: ${remainingInteractions}`
  ]
    .filter(Boolean)
    .join("\n");

  return `${meta}\n\nMensaje del usuario:\n${base}`;
}

// ===============================================================
// 4. FUNCIÓN PRINCIPAL — getDemoWelcomeReply()
// ===============================================================
export async function getDemoWelcomeReply(
  openai,
  {
    message,
    history = [],
    userName = "",
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
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.6,
      max_tokens: 120,
      frequency_penalty: 0.2
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      (safeLang === "en"
        ? "I couldn’t generate a full response. Please try again."
        : "No pude generar una respuesta completa. Intenta de nuevo.");

    return reply;
  } catch (err) {
    console.error("❌ ERROR REAL en getDemoWelcomeReply:", err);

    const isRateLimit =
      err?.status === 429 ||
      err?.code === "rate_limit_exceeded" ||
      err?.error?.code === "rate_limit_exceeded";

    if (isRateLimit) {
      return safeLang === "en"
        ? "The demo reached its temporary technical limit. Try again in a few moments."
        : "La demo alcanzó temporalmente su límite técnico. Intenta de nuevo en unos momentos.";
    }

    return safeLang === "en"
      ? "There was a temporary issue. Please try again."
      : "Hubo un problema temporal. Intenta de nuevo.";
  }
}

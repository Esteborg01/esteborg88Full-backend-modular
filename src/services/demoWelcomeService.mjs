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
        "Reply ONLY in English, short (2–4 sentences), direct, warm and practical."
      );
    case "pt":
      return (
        "Você é Esteborg, coach executivo em comunicação, liderança e clareza mental. " +
        "Responda SOMENTE em português, curto (2–4 frases), direto e prático."
      );
    case "fr":
      return (
        "Tu es Esteborg, coach exécutif en communication, leadership et clarté mentale. " +
        "Réponds UNIQUEMENT en français, court (2–4 phrases), direct et chaleureux."
      );
    case "it":
      return (
        "Sei Esteborg, coach esecutivo di comunicazione, leadership e chiarezza mentale. " +
        "Rispondi SOLO in italiano, breve (2–4 frasi), chiaro e pratico."
      );
    case "de":
      return (
        "Du bist Esteborg, Executive Coach für Kommunikation, Führung und mentale Klarheit. " +
        "Antworte NUR auf Deutsch, kurz (2–4 Sätze), direkt und professionell."
      );
    case "es":
    default:
      return (
        "Eres Esteborg, coach ejecutivo en comunicación, liderazgo y claridad mental. " +
        "Responde SIEMPRE en español latino, breve (2–4 frases), directo y práctico."
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

// src/services/demoWelcomeService.mjs

// 1. Inferimos idioma a partir del historial, el último mensaje o el idioma explícito
function inferLang(history = [], message = "", explicitLang) {
  const allowed = ["es", "en", "pt", "fr", "it", "de"];

  if (explicitLang && allowed.includes(explicitLang)) {
    return explicitLang;
  }

  const text =
    (Array.isArray(history) ? history : [])
      .map((m) => (m && m.content) || "")
      .join(" ")
      .toLowerCase() + " " + String(message || "").toLowerCase();

  // Heurísticas muy simples
  if (text.match(/[áéíóúñ]/)) return "es";
  if (text.includes(" the ") || text.includes(" and ")) return "en";
  if (
    text.includes(" você ") ||
    text.includes(" não ") ||
    (text.includes(" que ") && text.includes("ção"))
  )
    return "pt";
  if (
    text.includes(" vous ") ||
    text.includes(" être ") ||
    text.includes(" merci ")
  )
    return "fr";
  if (
    text.includes(" grazie ") ||
    text.includes(" ciao ") ||
    text.includes(" per favore ")
  )
    return "it";
  if (
    text.includes(" und ") ||
    text.includes(" nicht ") ||
    text.includes(" danke ")
  )
    return "de";

  return "es";
}

// 2. Prompt base por idioma (coach directo y cálido, orientado a 3 planes)
function getSystemPromptByLang(lang) {
  switch ((lang || "es").toLowerCase()) {
    case "en":
      return (
        "You are Esteborg, an executive coach in communication, sales and professional AI. " +
        "Your mission in this FREE 14-step demo is to: (1) make a quick but deep assessment of the user in four areas " +
        "(communication style, listening, boundaries and leadership under pressure), and (2) gently guide them to one of three plans: " +
        "Plan 1: Communication & Leadership, Plan 2: PRO Sales, Plan 3: AI applied professionally. " +
        "Reply ONLY in natural, fluent English, focused on communication, emotional intelligence, leadership, sales mindset " +
        "and the intelligent use of AI at work (not on ERPs, software vendors or other technical topics). " +
        "Keep answers relatively short (3–6 sentences), warm, direct and practical. " +
        "Always speak like a calm, confident senior coach, not like a generic chatbot. " +
        "During the first interactions of the demo you must ask four specific questions: " +
        "1) When someone tells you something you do not like, do you tend to answer quickly, stay quiet, or postpone the conversation? " +
        "2) When you listen to someone, do you truly understand their intention or do you stay only with the literal words? " +
        "3) How easy is it for you to say 'no' or set a clear boundary without feeling guilty? " +
        "4) When you are under pressure, do you lead the conversation or adapt to what others want? " +
        "Use their answers to infer their main behavioral pattern and to decide which of the three plans would help them most. " +
        "In every answer you must: (1) briefly acknowledge what they said, (2) give one clear and useful insight " +
        "about their situation using emotional psychology and consultative thinking, (3) offer ONE concrete suggestion, " +
        "example or micro-tool they can use immediately, (4) end with ONE follow-up question that helps advance this mini-assessment, " +
        "and (5) immediately after the question, add a very short example in parentheses of how the user could answer it. "
      );
    case "es":
    default:
      return (
        "Eres Esteborg, coach ejecutivo en comunicación, ventas y uso profesional de la IA. " +
        "Tu misión en esta DEMO GRATUITA de 14 pasos es: (1) hacer un diagnóstico rápido pero profundo en cuatro áreas " +
        "(cómo se comunica, cómo escucha, cómo pone límites y cómo lidera bajo presión), y (2) guiarle de forma natural " +
        "hacia uno de estos tres planes: Plan 1: Comunicación y Liderazgo, Plan 2: Ventas PRO, Plan 3: IA aplicada profesionalmente. " +
        "Responde SIEMPRE en español latino natural y fluido, enfocado en comunicación, inteligencia emocional, liderazgo, " +
        "mentalidad comercial y uso inteligente de la IA en el trabajo (no en ERPs, proveedores de software u otros temas técnicos). " +
        "Mantén las respuestas relativamente cortas (3–6 frases), cálidas, directas y muy prácticas. " +
        "Habla siempre como un coach senior seguro, claro y humano, nunca como un chatbot genérico. " +
        "En las primeras interacciones de la demo deberás hacer cuatro preguntas específicas: " +
        "1) Cuando alguien te dice algo que no te gusta, ¿tiendes a responder rápido, callarte o posponer la conversación? " +
        "2) Cuando escuchas a alguien, ¿realmente entiendes su intención o te quedas en las palabras textuales? " +
        "3) ¿Qué tan fácil te resulta decir 'no' o poner un límite claro sin sentir culpa? " +
        "4) Cuando estás bajo presión, ¿lideras la conversación o te adaptas a lo que los demás quieren? " +
        "Usa sus respuestas para detectar su patrón principal y para decidir cuál de los tres planes es el que más le conviene. " +
        "En cada respuesta debes: (1) reconocer brevemente lo que dijo, (2) devolver un insight claro y útil sobre su situación " +
        "apoyado en psicología emocional y pensamiento consultivo, (3) ofrecer una sugerencia concreta, ejemplo o micro herramienta " +
        "que pueda aplicar ya mismo, (4) cerrar con UNA sola pregunta de seguimiento que ayude a avanzar este mini diagnóstico, " +
        "y (5) inmediatamente después de la pregunta, agregar un ejemplo muy breve entre paréntesis de cómo la persona podría responder."
      );
  }
}

// 3. Guardas de tema para no desviarnos a ERP u otras cosas
function getTopicGuardByLang(lang) {
  switch ((lang || "es").toLowerCase()) {
    case "en":
      return (
        "TOPIC BOUNDARY: In this free demo you ONLY work on communication, emotional intelligence, leadership, boundaries, " +
        "sales mindset and professional use of AI. If the user asks about ERP systems, software vendors, religion, politics or other " +
        "technical topics, DO NOT go deep. Briefly say (in 1–2 sentences) that this demo is focused on communication, leadership, sales " +
        "and professional AI, and invite them to book a full 1:1 session at https://esteborg.live for that type of question."
      );
    case "es":
    default:
      return (
        "LÍMITE DE TEMA: En esta demo gratuita SOLO trabajas temas de comunicación, inteligencia emocional, liderazgo, límites sanos, " +
        "mentalidad comercial y uso profesional de la IA. Si la persona te pregunta por ERPs, proveedores de software, religión, política " +
        "u otros temas técnicos fuera de comunicación/liderazgo/ventas/IA, NO entres a detalle. Responde muy breve (1–2 frases) que esta demo " +
        "está enfocada en comunicación, liderazgo, ventas e IA profesional, y sugiérele agendar una sesión completa en https://esteborg.live " +
        "para trabajar ese tipo de tema."
      );
  }
}

// 4. Prompt especial según etapa (normal, penúltima, última)
function getStagePrompt(lang, step, maxSteps) {
  const l = (lang || "es").toLowerCase();
  const max = typeof maxSteps === "number" && maxSteps > 0 ? maxSteps : 14;
  const current = typeof step === "number" && step > 0 ? step : 1;
  const isPenultimate = current === max - 1;
  const isFinal = current >= max;

  if (!isPenultimate && !isFinal) return "";

  if (isPenultimate) {
    if (l === "en") {
      return (
        "You are at the second-to-last interaction of this free demo. " +
        "In this answer, keep the same coaching style, but explicitly mention that this is the user’s second-to-last turn in the demo. " +
        "Tell them that in the next and final answer you will give them a concise closing summary, highlight their main pattern in " +
        "communication, listening, boundaries and leadership, and suggest which of the three plans (Communication & Leadership, PRO Sales, " +
        "or AI applied professionally) seems the best fit for them. " +
        "End with ONE focused question that prepares the ground for that final answer, plus a short example in parentheses."
      );
    }
    if (l === "es") {
      return (
        "Estás en la PENÚLTIMA interacción de esta demo gratuita. " +
        "En esta respuesta mantén el mismo estilo de coaching, pero menciona explícitamente que esta es la penúltima interacción de la demo. " +
        "Dile que en la siguiente y última respuesta le darás un cierre ejecutivo, le reflejarás el patrón principal que ves en su comunicación, " +
        "escucha, forma de poner límites y liderazgo, y le sugerirás cuál de los tres planes (Comunicación y Liderazgo, Ventas PRO o IA aplicada " +
        "profesionalmente) parece el más adecuado para él o para ella. " +
        "Cierra con UNA sola pregunta enfocada que prepare ese cierre final, más un ejemplo corto entre paréntesis."
      );
    }
    return (
      "You are at the second-to-last interaction of this free demo. " +
      "Mention clearly that this is the penultimate turn and that in the next and final answer you will give a concise closing summary, " +
      "reflect their main communication pattern and suggest which of the three plans fits them best. " +
      "End with ONE focused question that prepares that final answer, plus a short example in parentheses."
    );
  }

  // Final
  if (l === "en") {
    return (
      "You are at the FINAL interaction of a 14-step free demo. " +
      "In this answer you must: (1) respond to the user’s last message, (2) give a concise summary of the main pattern you see in their " +
      "communication, listening, boundaries and leadership, (3) suggest 1–2 concrete next steps they could take, and (4) clearly state that " +
      "this is the end of the free demo. " +
      "Explicitly recommend ONE of these three plans as the most suitable for them: Plan 1: Communication & Leadership, Plan 2: PRO Sales, " +
      "or Plan 3: AI applied professionally. " +
      "Invite them clearly but respectfully to continue working with Esteborg by joining that plan at https://membersvip.esteborg.live or " +
      "booking a full session at https://esteborg.live. " +
      "Be polite, warm and professional. DO NOT ask for another question, and DO NOT invite further interaction inside this demo."
    );
  }
  if (l === "es") {
    return (
      "Estás en la ÚLTIMA interacción de una demo gratuita de 14 pasos. " +
      "En esta respuesta debes: (1) responder al último mensaje de la persona, (2) darle un resumen ejecutivo del patrón principal que ves " +
      "en su comunicación, escucha, forma de poner límites y liderazgo, (3) sugerir 1–2 siguientes pasos concretos que pueda tomar, y (4) " +
      "dejar muy claro que aquí termina la demo gratuita. " +
      "Recomiéndale de forma explícita UNO de estos tres planes como el más adecuado para su perfil: Plan 1: Comunicación y Liderazgo, " +
      "Plan 2: Ventas PRO o Plan 3: IA aplicada profesionalmente. " +
      "Invítale de forma profesional, cálida y directa a seguir trabajando con Esteborg contratando ese plan en https://membersvip.esteborg.live " +
      "y/o agendando una sesión completa en https://esteborg.live. " +
      "NO hagas más preguntas y NO invites a seguir interactuando dentro de esta demo."
    );
  }

  return (
    "You are at the FINAL interaction of a 14-step free demo. " +
    "Respond to the user’s last message, give a concise summary of their main communication pattern, suggest 1–2 next steps, clearly state " +
    "that this is the end of the free demo, and recommend the most suitable plan among: Communication & Leadership, PRO Sales, or AI applied " +
    "professionally. Invite them to continue with Esteborg at https://esteborg.live and/or https://membersvip.esteborg.live. Do NOT ask for more questions."
  );
}

// 5. Función principal exportada
export async function getDemoWelcomeReply(
  openai,
  { message, userName, history = [], lang, demoStep, maxDemoInteractions }
) {
  const effectiveLang = inferLang(history, message, lang);
  const maxSteps =
    typeof maxDemoInteractions === "number" && maxDemoInteractions > 0
      ? maxDemoInteractions
      : 14;
  const currentStep =
    typeof demoStep === "number" && demoStep > 0 ? demoStep : 1;

  const basePrompt = getSystemPromptByLang(effectiveLang);
  const topicGuard = getTopicGuardByLang(effectiveLang);
  const stagePrompt = getStagePrompt(effectiveLang, currentStep, maxSteps);

  const systemContent = [basePrompt, topicGuard, stagePrompt]
    .filter(Boolean)
    .join("\n\n");

  const safeHistory = Array.isArray(history) ? history : [];

  const userContent =
    userName && typeof userName === "string" && userName.trim().length > 0
      ? `Nombre del usuario: ${userName}\nIdioma preferido: ${effectiveLang}\nMensaje: ${message}`
      : `Idioma preferido: ${effectiveLang}\nMensaje: ${message}`;

  const messages = [
    { role: "system", content: systemContent },
    ...safeHistory,
    { role: "user", content: String(userContent) },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 260,
    });

    const reply =
      completion?.choices?.[0]?.message?.content ||
      (effectiveLang === "en"
        ? "I do not have a response at this moment."
        : "No tengo respuesta en este momento.");

    return {
      reply,
      effectiveLang,
      demoStatus:
        currentStep >= maxSteps
          ? "finished"
          : currentStep === maxSteps - 1
          ? "penultimate"
          : "active",
      interactionCount: currentStep,
      remainingInteractions: Math.max(maxSteps - currentStep, 0),
    };
  } catch (err) {
    console.error("❌ Error real en getDemoWelcomeReply:", err);

    if (err?.status === 429) {
      const msgEn =
        "Right now this free demo is at its limit of requests. Please wait a few seconds and try again, or book a full session at https://esteborg.live.";
      const msgEs =
        "En este momento la demo gratuita está al límite de peticiones. Espera unos segundos y vuelve a intentar, o agenda una sesión en https://esteborg.live.";

      return {
        reply: effectiveLang === "en" ? msgEn : msgEs,
        effectiveLang,
        demoStatus: "error",
        interactionCount: currentStep,
        remainingInteractions: Math.max(maxSteps - currentStep, 0),
      };
    }

    const fallbackEn =
      "There was an unexpected error. Please try again in a moment.";
    const fallbackEs =
      "Ocurrió un error inesperado. Intenta de nuevo en un momento.";

    return {
      reply: effectiveLang === "en" ? fallbackEn : fallbackEs,
      effectiveLang,
      demoStatus: "error",
      interactionCount: currentStep,
      remainingInteractions: Math.max(maxSteps - currentStep, 0),
    };
  }
}

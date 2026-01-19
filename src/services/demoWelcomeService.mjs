// src/services/demoWelcomeService.mjs

// 1. Inferimos idioma
function inferLang(history = [], message = "", explicitLang) {
  if (explicitLang && ["es", "en", "pt", "fr", "it", "de"].includes(explicitLang)) {
    return explicitLang;
  }

  const text =
    (history || [])
      .map((m) => (m && m.content) || "")
      .join(" ")
      .toLowerCase() + " " + (message || "").toLowerCase();

  if (text.match(/[áéíóúñ]/)) return "es";
  if (text.includes(" the ") || text.includes(" and ")) return "en";
  if (text.includes(" você ") || text.includes("claridade")) return "pt";
  if (text.includes(" vous ") || text.includes("clarté")) return "fr";
  if (text.includes(" lei ") || text.includes("chiarezza")) return "it";
  if (text.includes(" klarheit ") || text.includes("führung")) return "de";

  return "es";
}

// 2. Prompt base por idioma (coach directo y cálido)
function getSystemPromptByLang(lang) {
  switch ((lang || "es").toLowerCase()) {
    case "en":
      return (
        "You are Esteborg, an executive coach in communication, leadership and mental clarity. " +
        "Reply ONLY in natural, fluent English, focused on communication, emotional intelligence and leadership (not on ERP, software, or technical topics). " +
        "Keep answers relatively short (3–6 sentences), warm, direct and practical. " +
        "In every answer you must: (1) briefly acknowledge what the user said, (2) give one clear and useful insight about their situation, " +
        "(3) offer one concrete suggestion, example or micro-tool they can apply, and (4) ALWAYS finish with one specific follow-up question that helps advance this mini-assessment, " +
        "and (5) immediately after the question, add a very short example in parentheses of how the user could answer it."
      );
    case "es":
    default:
      return (
        "Eres Esteborg, coach ejecutivo en comunicación, liderazgo y claridad mental. " +
        "Responde SIEMPRE en español latino natural y fluido, enfocado en comunicación, inteligencia emocional y liderazgo (no en ERP, software o temas técnicos). " +
        "Mantén las respuestas relativamente cortas (3–6 frases), cálidas, directas y muy prácticas. " +
        "En cada respuesta debes: (1) reconocer brevemente lo que la persona dijo, (2) devolver un insight claro y útil sobre su situación, " +
        "(3) ofrecer una sugerencia concreta, ejemplo o micro herramienta que pueda aplicar ya mismo, y (4) TERMINAR SIEMPRE con una sola pregunta muy concreta de seguimiento que ayude a avanzar este mini diagnóstico, " +
        "y (5) inmediatamente después de la pregunta, agregar un ejemplo muy breve entre paréntesis de cómo la persona podría responder."
      );
  }
}

// 3. Guard de tema (si se sale a ERP / proveedores → lo mandamos a esteborg.live)
function getTopicGuardByLang(lang) {
  switch ((lang || "es").toLowerCase()) {
    case "en":
      return (
        "TOPIC BOUNDARY: In this free demo you ONLY work on communication, emotional intelligence, leadership and mental clarity. " +
        "If the user asks about ERP systems, software vendors, CRMs, marketing tactics, finances, politics, religion, or any technical topic outside communication/leadership, " +
        "DO NOT give detailed recommendations or external providers. Instead, briefly say (in 1–2 sentences) that this demo is focused on communication and leadership, " +
        "and ALWAYS invite them to book a 1:1 session at https://esteborg.live for that type of question."
      );
    case "es":
    default:
      return (
        "LÍMITE DE TEMA: En esta demo gratuita SOLO trabajas temas de comunicación, inteligencia emocional, liderazgo y claridad mental. " +
        "Si la persona te pregunta por ERPs, proveedores de software, CRMs, marketing, finanzas, política, religión u otros temas técnicos fuera de comunicación/liderazgo, " +
        "NO des recomendaciones detalladas ni sugieras proveedores externos. En lugar de eso, responde muy breve (1–2 frases) que esta demo está enfocada en comunicación y liderazgo " +
        "y SIEMPRE invítale a agendar una sesión en https://esteborg.live para ver ese tipo de tema a profundidad."
      );
  }
}

// 4. Prompt especial según etapa (normal, penúltima, última)
function getStagePrompt(lang, step, maxSteps) {
  const l = (lang || "es").toLowerCase();
  const isPenultimate = step === maxSteps - 1;
  const isFinal = step >= maxSteps;

  if (!isPenultimate && !isFinal) return "";

  if (isPenultimate) {
    if (l === "en") {
      return (
        "You are at the second-to-last interaction of this free demo. " +
        "In this answer, keep the same coaching style, but explicitly mention that this is the user’s second-to-last turn in the demo. " +
        "Tell them that in the next and final answer you will give them a concise closing summary and next steps. " +
        "End with ONE focused question that prepares the ground for that final answer, plus a short example in parentheses."
      );
    }
    if (l === "es") {
      return (
        "Estás en la PENÚLTIMA interacción de esta demo gratuita. " +
        "En esta respuesta mantén el mismo estilo de coaching, pero menciona explícitamente que esta es la penúltima interacción de la demo. " +
        "Dile que en la siguiente y última respuesta le darás un cierre ejecutivo y próximos pasos. " +
        "Cierra con UNA sola pregunta enfocada que prepare ese cierre final, más un ejemplo corto entre paréntesis."
      );
    }
    return (
      "You are at the second-to-last interaction of this free demo. " +
      "Mention clearly that this is the penultimate turn and that the next answer will be the final one, where you will give a concise closing summary and next steps. " +
      "End with ONE focused question that prepares that final answer, plus a short example in parentheses."
    );
  }

  // Final
  if (l === "en") {
    return (
      "You are at the FINAL interaction of a 14-step free demo. " +
      "In this answer you must: (1) respond to the user’s last message, (2) give a concise executive summary of the main pattern you see in their communication/leadership, " +
      "(3) suggest 1–2 concrete next steps they could take, and (4) clearly state that this is the end of the free demo. " +
      "Invite them explicitly to continue working with Esteborg by acquiring a full plan or session at https://esteborg.live and/or joining the full program at https://membersvip.esteborg.live. " +
      "Be polite, warm and professional. DO NOT ask for another question, and DO NOT invite further interaction inside this demo."
    );
  }
  if (l === "es") {
    return (
      "Estás en la ÚLTIMA interacción de una demo gratuita de 14 pasos. " +
      "En esta respuesta debes: (1) responder al último mensaje de la persona, (2) darle un resumen ejecutivo y claro del patrón principal que observas en su comunicación/liderazgo, " +
      "(3) sugerir 1–2 siguientes pasos concretos que pueda tomar, y (4) dejar muy claro que aquí termina la demo gratuita. " +
      "Invítale de forma profesional, cálida y directa a seguir trabajando contigo adquiriendo un plan o una sesión completa en https://esteborg.live " +
      "y/o entrando al programa completo en https://membersvip.esteborg.live. Sé directo, elegante y educativo. NO hagas más preguntas y NO invites a seguir interactuando dentro de esta demo."
    );
  }

  return (
    "You are at the FINAL interaction of a 14-step free demo. " +
    "Respond to the user’s last message, give a concise summary of their main pattern in communication/leadership, suggest 1–2 next steps, " +
    "and clearly state that this is the end of the free demo. Invite them to continue working with Esteborg at https://esteborg.live " +
    "and/or https://membersvip.esteborg.live. Do NOT ask for more questions."
  );
}

// 5. Función principal
export async function getDemoWelcomeReply(
  openai,
  {
    message,
    history = [],
    userName,
    interactionCount = 0,
    remainingInteractions = 0,
    lang,
    demoStep,
    maxDemoInteractions,
  } = {}
) {
  const effectiveLang = inferLang(history, message, lang);

  const maxSteps = maxDemoInteractions || 14;

  let step = demoStep || 0;
  if (!step) {
    if (maxDemoInteractions && typeof remainingInteractions === "number") {
      step = maxDemoInteractions - remainingInteractions;
    } else if (typeof interactionCount === "number") {
      step = interactionCount + 1;
    } else {
      step = 1;
    }
  }

  const basePrompt = getSystemPromptByLang(effectiveLang);
  const topicGuard = getTopicGuardByLang(effectiveLang);
  const stagePrompt = getStagePrompt(effectiveLang, step, maxSteps);

  const messages = [
    { role: "system", content: basePrompt },
    { role: "system", content: topicGuard },
  ];

  if (stagePrompt) {
    messages.push({ role: "system", content: stagePrompt });
  }

  if (Array.isArray(history)) {
    for (const msg of history) {
      if (msg && typeof msg.role === "string" && typeof msg.content === "string") {
        messages.push(msg);
      }
    }
  }

  let userContent = message || "";

  if (userName && step === 1) {
    userContent = `Mi nombre es ${userName} y quiero trabajar en esto: ` + userContent;
  }

  messages.push({
    role: "user",
    content: userContent,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.6,
      max_tokens: 260,
      frequency_penalty: 0.2,
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      (effectiveLang === "en"
        ? "There was an issue generating a response. Please try again."
        : "Ocurrió un problema generando la respuesta. Intenta de nuevo.");

    return reply;
  } catch (err) {
    console.error("❌ Error real en getDemoWelcomeReply:", err);

    if (err?.status === 429) {
      return effectiveLang === "en"
        ? "Right now this free demo is at its limit of requests. Please wait a few seconds and try again, or book a session at https://esteborg.live."
        : "En este momento la demo gratuita está al límite de peticiones. Espera unos segundos y vuelve a intentar, o agenda una sesión en https://esteborg.live.";
    }

    return effectiveLang === "en"
      ? "There was an unexpected error. Please try again in a moment."
      : "Ocurrió un error inesperado. Intenta de nuevo en un momento.";
  }
}

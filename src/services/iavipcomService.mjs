// src/services/iavipcomService.mjs
import { buildIaVipComSystemPrompt } from "./iavipcomBrain.mjs";

export async function getIaVipComReply(
  openai,
  { message, history = [], userName = "", lang = "es" }
) {
  const safeHistory = sanitizeHistory(history);

  const cognitiveHints = deriveCognitiveHints({ history: safeHistory, message });
  const orgHints = deriveOrgHints({ history: safeHistory, message });

  const systemPrompt = buildIaVipComSystemPrompt({
    lang,
    cognitiveHints,
    orgHints,
  });

  const messages = [
    { role: "system", content: systemPrompt },
    ...safeHistory.slice(-20),
    {
      role: "user",
      // Opción A (recomendada): no forzar formato; deja que el brain pregunte nombre
      content: String(message || "").trim(),
      // Si INSISTES en incluir userName, usa esta versión B y comenta la A:
      // content: userName
      //   ? `Me llamo ${userName}. ${String(message || "").trim()}`
      //   : String(message || "").trim(),
    },
  ];

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL_IAVIPCOM || "gpt-4o-mini",
    messages,
    temperature: 0.7,
  });

  return (
    completion?.choices?.[0]?.message?.content?.trim() ||
    "No tengo respuesta en este momento."
  );
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && typeof m === "object")
    .map((m) => ({
      role: m.role === "assistant" || m.role === "user" ? m.role : "user",
      content: typeof m.content === "string" ? m.content : String(m.content ?? ""),
    }))
    .filter((m) => m.content.trim().length > 0);
}

function deriveCognitiveHints({ history = [], message = "" } = {}) {
  const lastUser = (history || [])
    .filter((m) => m.role === "user")
    .slice(-5)
    .map((m) => (m.content || "").toLowerCase())
    .join(" ");

  const msg = (message || "").toLowerCase();
  const text = `${lastUser} ${msg}`;

  // Fase
  let phase = "discovery";
  if (
    text.includes("módulo") ||
    text.includes("modulo") ||
    text.includes("assessment") ||
    text.includes("evaluación") ||
    text.includes("evaluacion")
  ) {
    phase = "training";
  }
  if (
    text.includes("implementar") ||
    text.includes("implementación") ||
    text.includes("implementacion") ||
    text.includes("hoy mismo") ||
    text.includes("en mi equipo") ||
    text.includes("en mi trabajo")
  ) {
    phase = "execution";
  }

  // Madurez
  let maturity = "unknown";
  if (
    text.includes("nunca he usado") ||
    text.includes("desde cero") ||
    text.includes("principiante")
  ) {
    maturity = "beginner";
  } else if (
    text.includes("ya uso") ||
    text.includes("uso chatgpt") ||
    text.includes("prompts") ||
    text.includes("workflow") ||
    text.includes("flujos")
  ) {
    maturity = "intermediate";
  } else if (
    text.includes("agentes") ||
    text.includes("automatización") ||
    text.includes("automatizacion") ||
    text.includes("api") ||
    text.includes("integración") ||
    text.includes("integracion")
  ) {
    maturity = "advanced";
  }

  // Herramientas actuales
  let toolLevel = "none";
  if (text.includes("chatgpt")) toolLevel = "chatgpt";
  if (
    text.includes("copilot") ||
    text.includes("outlook") ||
    text.includes("excel") ||
    text.includes("powerpoint") ||
    text.includes("word") ||
    text.includes("teams")
  ) {
    toolLevel = "copilot";
  }
  if (text.includes("gemini")) toolLevel = "gemini";

  // Resistencia / saturación
  let resistance = "unknown";
  if (
    text.includes("demasiado") ||
    text.includes("mucho texto") ||
    text.includes("resúmelo") ||
    text.includes("resumelo") ||
    text.includes("muy largo")
  ) {
    resistance = "high";
  } else if (
    text.includes("ok") ||
    text.includes("va") ||
    text.includes("dale") ||
    text.includes("sigamos") ||
    text.includes("perfecto")
  ) {
    resistance = "low";
  }

  return { phase, maturity, toolLevel, resistance };
}

function deriveOrgHints({ message = "", history = [] } = {}) {
  const lastUser = (history || [])
    .filter((m) => m.role === "user")
    .slice(-6)
    .map((m) => (m.content || "").toLowerCase())
    .join(" ");

  const msg = (message || "").toLowerCase();
  const text = `${lastUser} ${msg}`;

  const orgSignals = [
    "equipo",
    "organización",
    "organizacion",
    "empresa",
    "corporativo",
    "director",
    "gerente",
    "stakeholder",
    "comité",
    "comite",
    "board",
    "presupuesto",
    "kpi",
    "okrs",
    "proceso",
    "política",
    "politica",
    "aprobación",
    "aprobacion",
  ];

  const orgMode = orgSignals.some((w) => text.includes(w));

  let roleLevel = "individual";
  if (
    text.includes("director") ||
    text.includes("vp") ||
    text.includes("c-level") ||
    text.includes("ceo") ||
    text.includes("board") ||
    text.includes("consejo")
  ) {
    roleLevel = "executive";
  } else if (
    text.includes("gerente") ||
    text.includes("manager") ||
    text.includes("líder") ||
    text.includes("lider") ||
    text.includes("jefe")
  ) {
    roleLevel = "manager";
  }

  return { orgMode, roleLevel };
}

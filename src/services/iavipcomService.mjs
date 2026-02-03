// src/services/iavipcomService.mjs

import { buildIaVipComSystemPrompt } from "./iavipcomBrain.mjs";

import { deriveCognitiveHints } from "../core/titanCognitiveEngine.mjs";
import { getUserMemory, updateUserMemory } from "../core/titanMemoryEngine.mjs";
import { derivePsychState } from "../core/titanPsychEngine.mjs";
import { deriveDensityProfile } from "../core/titanDensityEngine.mjs";

// Progreso simple “dónde se quedó”
import { getUserProgress, setUserProgress } from "../core/titanProgressEngine.mjs";

export async function getIaVipComReply(
  openai,
  { message, history = [], userName = "", lang = "es", userId = "anon" }
) {
  const effectiveUserId = String((userId || "").trim().toLowerCase() || "anon");

  const safeHistory = sanitizeHistory(history);

  // Cognitive/Psych/Density (Core)
  const cognitiveHints = deriveCognitiveHints({ history: safeHistory, message, lang });

  // Memoria (Core)
  getUserMemory(effectiveUserId);

  const psychState = derivePsychState({
    cognitiveHints,
    history: safeHistory,
    message,
  });

  const densityProfile = deriveDensityProfile({ psychState });

  updateUserMemory(effectiveUserId, {
    profile: {
      maturity: cognitiveHints.maturity,
      toolLevel: cognitiveHints.toolLevel,
      phase: cognitiveHints.phase,
    },
    psychologicalState: psychState,
    densityState: densityProfile,
  });

  // Progreso (simple)
  const prog = getUserProgress(effectiveUserId) || {
    module: 1,
    day: 1,
    lastTool: "none",
    lang,
  };

  // Avance ultra simple (no “curso”, solo checkpoint)
  // Si el usuario dice “siguiente/continuar/next”, subimos 1 día (máx 20)
  // multi-idioma mínimo
  const m = String(message || "").toLowerCase();
  const wantsNext =
    m.includes("siguiente") ||
    m.includes("continuar") ||
    m.includes("sigamos") ||
    m.includes("next") ||
    m.includes("continue") ||
    m.includes("continuer") ||
    m.includes("suivant") ||
    m.includes("continua") ||
    m.includes("avanti") ||
    m.includes("weiter") ||
    m.includes("nächste") ||
    m.includes("proximo") ||
    m.includes("próximo");

  if (wantsNext) {
    setUserProgress(effectiveUserId, {
      day: Math.min((prog.day || 1) + 1, 20),
      lang,
    });
  } else {
    // mínimo: guarda lang para re-entrada consistente
    setUserProgress(effectiveUserId, { lang });
  }

  // System prompt (Brain multi-idioma)
  const systemPrompt = buildIaVipComSystemPrompt(lang);

  const enrichedSystemPrompt = `${systemPrompt}

TITAN CONTEXT (internal)
maturity=${cognitiveHints.maturity}
tool=${cognitiveHints.toolLevel}
phase=${cognitiveHints.phase}
resistance=${psychState.resistanceLevel}
overwhelm=${psychState.overwhelmRisk}
density=${densityProfile.preferredLength}

PROGRESS (internal)
progress_module=${prog.module}
progress_day=${prog.day}
progress_lastTool=${prog.lastTool}
`;

  const messages = [
    { role: "system", content: enrichedSystemPrompt },
    ...safeHistory.slice(-20),
    {
      role: "user",
      content: userName
        ? `Usuario: ${userName}\nMensaje: ${message}`
        : message,
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

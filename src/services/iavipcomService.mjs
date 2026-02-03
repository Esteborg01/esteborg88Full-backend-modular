// src/services/iavipcomService.mjs

import { buildIaVipComSystemPrompt } from "./iavipcomBrain.mjs";

// Core engines (si ya los tienes en /src/core)
import { deriveCognitiveHints } from "../core/titanCognitiveEngine.mjs";
import { getUserMemory, updateUserMemory } from "../core/titanMemoryEngine.mjs";
import { derivePsychState } from "../core/titanPsychEngine.mjs";
import { deriveDensityProfile } from "../core/titanDensityEngine.mjs";

export async function getIaVipComReply(
  openai,
  { message, history = [], userName = "", lang = "es", userId = "anon", session = null }
) {
  const safeHistory = sanitizeHistory(history);

  const cognitiveHints = deriveCognitiveHints({
    history: safeHistory,
    message,
    lang,
  });

  // Memoria (persistente DB-ready en tu engine; mientras tanto puede ser in-memory)
  const effectiveUserId = String(userId || "anon").trim().toLowerCase() || "anon";
  const mem = getUserMemory(effectiveUserId);

  const psychState = derivePsychState({
    cognitiveHints,
    history: safeHistory,
    message,
    session,
  });

  const densityProfile = deriveDensityProfile({ psychState });

  updateUserMemory(effectiveUserId, {
    profile: {
      maturity: cognitiveHints.maturity,
      toolLevel: cognitiveHints.toolLevel,
      phase: cognitiveHints.phase,
      lang,
    },
    psychologicalState: psychState,
    densityState: densityProfile,
    // sesión ligera
    last: {
      userName: userName || (session?.memory?.userName || ""),
      lastUserMessage: message,
      lastSeenAt: Date.now(),
    },
  });

  // Brain base (NO tocar)
  const systemPrompt = buildIaVipComSystemPrompt(lang);

  // Contexto interno: evita “reinicios” y repeticiones
  const sessionTurn = Number(session?.turn || 0);
  const sessionName = session?.memory?.userName || userName || "";
  const sessionLastUser = session?.memory?.lastUserMessage || "";
  const sessionLastAssistant = session?.memory?.lastAssistantMessage || "";
  const sessionGoal90 = session?.memory?.goal90 || "";
  const sessionLastFocus = session?.memory?.lastFocus || "";

  const enrichedSystemPrompt = `${systemPrompt}

TITAN CONTEXT (internal)
turn=${sessionTurn}
lang=${lang}
userName=${sessionName}
goal90=${sessionGoal90}
lastFocus=${sessionLastFocus}
lastUser=${sessionLastUser}
lastAssistant=${sessionLastAssistant}

cognitive.phase=${cognitiveHints.phase}
cognitive.maturity=${cognitiveHints.maturity}
cognitive.tool=${cognitiveHints.toolLevel}
cognitive.resistance=${cognitiveHints.resistance}

psych.resistance=${psychState.resistanceLevel}
psych.overwhelm=${psychState.overwhelmRisk}

density.preferred=${densityProfile.preferredLength}

CRITICAL BEHAVIOR (internal)
- If turn>0: NEVER ask again for Tokken. NEVER restart with “tell me your 90-day goal” unless the user explicitly asks to restart.
- Continue from context. If the user changes topic, pivot WITHOUT resetting the session.
- Do not use markdown headings, asterisks, or course-like structure.
- Deliver one strong idea, then a natural CTA.
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

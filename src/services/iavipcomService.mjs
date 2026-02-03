// src/services/iavipcomService.mjs
import { buildIaVipComSystemPrompt } from "./iavipcomBrain.mjs";

import { deriveCognitiveHints } from "../core/titanCognitiveEngine.mjs";
import { getUserMemory, updateUserMemory } from "../core/titanMemoryEngine.mjs";
import { derivePsychState } from "../core/titanPsychEngine.mjs";
import { deriveDensityProfile } from "../core/titanDensityEngine.mjs";

export async function getIaVipComReply(
  openai,
  { message, history = [], userName = "", lang = "es", userId = "anon" }
) {
  // 1) userId efectivo (por ahora: si no viene userId, usamos userName; si no, anon)
  const effectiveUserId = String(
    (userId && userId !== "anon" ? userId : (userName || "")).trim().toLowerCase() || "anon"
  );

  // 2) Sanitizar history (para que OpenAI no reciba basura)
  const safeHistory = sanitizeHistory(history);

  // 3) Cognitive/Psych/Density
 const cognitiveHints = deriveCognitiveHints({ history: safeHistory, message, lang });

  // (Opcional) trae memoria actual por si luego quieres usarla en prompt
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

  // 4) System prompt (NO tocamos tu brain)
  const systemPrompt = buildIaVipComSystemPrompt(lang);

  const enrichedSystemPrompt = `${systemPrompt}

TITAN CONTEXT (internal)
maturity=${cognitiveHints.maturity}
tool=${cognitiveHints.toolLevel}
phase=${cognitiveHints.phase}
resistance=${psychState.resistanceLevel}
overwhelm=${psychState.overwhelmRisk}
density=${densityProfile.preferredLength}
`;

  // 5) Mensajes
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

// src/core/titanPsychEngine.mjs
export function derivePsychState({ cognitiveHints = {}, history = [], message = "" } = {}) {
  let resistanceLevel = "medium";
  let confidenceLevel = "medium";
  let overwhelmRisk = "low";

  if (cognitiveHints.resistance === "high") {
    resistanceLevel = "high";
    overwhelmRisk = "high";
  }

  if (cognitiveHints.maturity === "beginner") {
    overwhelmRisk = overwhelmRisk === "high" ? "high" : "medium";
  }

  if (cognitiveHints.maturity === "advanced") {
    confidenceLevel = "high";
  }

  // Señal adicional: respuestas ultra cortas repetidas -> resistencia / saturación
  const shortReplies = (history || [])
    .slice(-6)
    .filter(m => m?.role === "user" && String(m?.content || "").trim().length <= 10).length;

  if (shortReplies >= 3) {
    resistanceLevel = "high";
    overwhelmRisk = "high";
  }

  // Señal adicional: usuario pide velocidad/acción -> confianza/ejecución
  const t = `${(message || "").toLowerCase()}`;
  if (t.includes("dale") || t.includes("vamos") || t.includes("rápido") || t.includes("hoy")) {
    confidenceLevel = confidenceLevel === "high" ? "high" : "medium";
  }

  return { resistanceLevel, confidenceLevel, overwhelmRisk };
}

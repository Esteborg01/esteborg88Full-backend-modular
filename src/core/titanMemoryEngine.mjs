// src/core/titanMemoryEngine.mjs
// Memoria en RAM (Map) — DB-ready (luego lo cambias por Redis/Postgres sin tocar el resto)

const memoryStore = new Map();

/**
 * Estructura:
 * {
 *   userId,
 *   name,
 *   profile: { maturity, toolLevel, phase },
 *   psychologicalState: { resistanceLevel, confidenceLevel, overwhelmRisk },
 *   densityState: { preferredLength, lastAdjust },
 *   lastInteraction
 * }
 */

export function getUserMemory(userId = "anon") {
  const key = String(userId || "anon");

  if (!memoryStore.has(key)) {
    memoryStore.set(key, {
      userId: key,
      name: null,

      profile: {
        maturity: "unknown",
        toolLevel: "none",
        phase: "discovery",
      },

      psychologicalState: {
        resistanceLevel: "medium",
        confidenceLevel: "medium",
        overwhelmRisk: "low",
      },

      densityState: {
        preferredLength: "medium", // low | medium | high
        lastAdjust: Date.now(),
      },

      lastInteraction: Date.now(),
    });
  }

  return memoryStore.get(key);
}

export function updateUserMemory(userId = "anon", updates = {}) {
  const mem = getUserMemory(userId);

  if (updates.name !== undefined) mem.name = updates.name;

  if (updates.profile) Object.assign(mem.profile, updates.profile);
  if (updates.psychologicalState) Object.assign(mem.psychologicalState, updates.psychologicalState);
  if (updates.densityState) Object.assign(mem.densityState, updates.densityState);

  mem.lastInteraction = Date.now();
  return mem;
}

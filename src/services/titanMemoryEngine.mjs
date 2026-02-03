// TITAN MEMORY ENGINE — DB READY

const memoryStore = new Map();

/*
Estructura usuario:

{
  userId,
  name,
  profile,
  cognitiveState,
  psychologicalState,
  densityState,
  lastInteraction
}
*/

export function getUserMemory(userId) {
  if (!memoryStore.has(userId)) {
    memoryStore.set(userId, {
      userId,
      name: null,

      profile: {
        maturity: "unknown",
        toolLevel: "none",
        phase: "discovery"
      },

      psychologicalState: {
        resistanceLevel: "medium",
        confidenceLevel: "medium",
        overwhelmRisk: "low"
      },

      densityState: {
        preferredLength: "medium", // low | medium | high
        lastAdjust: Date.now()
      },

      lastInteraction: Date.now()
    });
  }

  return memoryStore.get(userId);
}

export function updateUserMemory(userId, updates = {}) {
  const mem = getUserMemory(userId);

  Object.assign(mem.profile, updates.profile || {});
  Object.assign(mem.psychologicalState, updates.psychologicalState || {});
  Object.assign(mem.densityState, updates.densityState || {});

  mem.lastInteraction = Date.now();

  return mem;
}

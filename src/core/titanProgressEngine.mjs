// src/core/titanProgressEngine.mjs

const progressStore = new Map();

/**
 * progress shape:
 * { module: 1..6, day: 1..20, lastTool: "chatgpt"|"copilot"|"gemini"|"none", lang: "es"... , updatedAt: number }
 */
export function getUserProgress(userId = "anon") {
  return progressStore.get(userId) || null;
}

export function setUserProgress(userId = "anon", patch = {}) {
  const prev = progressStore.get(userId) || {
    module: 1,
    day: 1,
    lastTool: "none",
    lang: "es",
    updatedAt: Date.now(),
  };

  const next = {
    ...prev,
    ...patch,
    updatedAt: Date.now(),
  };

  progressStore.set(userId, next);
  return next;
}

// src/utils/progressStore.mjs

// Almacenamiento en memoria por ahora (por email).
// Futuro: esto se puede mover a una DB sin cambiar el resto del código.

const progressByEmail = new Map();

/**
 * Actualiza el progreso de un usuario a partir de un evento de Esteborg.
 * @param {string|null} email
 * @param {{ type: string, module?: string, certification?: string }} event
 * @returns {object} estado actual del usuario
 */
export function updateUserProgress(email, event) {
  if (!email) {
    // Si no hay email, registramos solo en logs y salimos
    console.log("⚠️ Progreso sin email, solo log:", event);
    return null;
  }

  const now = new Date().toISOString();

  let state = progressByEmail.get(email);
  if (!state) {
    state = {
      email,
      modulesCompleted: [],
      currentModule: null,
      programCompleted: false,
      certificateIssued: false,
      lastEventAt: now,
    };
  }

  if (event.type === "module_completed" && event.module) {
    const moduleNumber = String(event.module);
    if (!state.modulesCompleted.includes(moduleNumber)) {
      state.modulesCompleted.push(moduleNumber);
      state.currentModule = moduleNumber;
      state.lastEventAt = now;
      console.log("🎓 Módulo completado:", { email, module: moduleNumber });
    }
  }

  if (event.type === "program_completed") {
    state.programCompleted = true;
    state.certificateIssued = event.certification === "true";
    state.lastEventAt = now;
    console.log("🏅 Programa completado:", {
      email,
      certificateIssued: state.certificateIssued,
    });
  }

  progressByEmail.set(email, state);
  return state;
}

/**
 * Obtiene el progreso actual de un usuario por email.
 * @param {string} email
 */
export function getUserProgress(email) {
  if (!email) return null;
  return progressByEmail.get(email) || null;
}

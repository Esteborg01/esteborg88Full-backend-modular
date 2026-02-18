// src/core/planCatalog.mjs
// Catálogo de planes (ajustable). Controla: duración + módulos permitidos.

export function getPlanConfig(planKey) {
  const plans = {
    // ✅ Ajusta si quieres que "IA Experto" incluya más módulos
    planesteborgiaexperto: { days: 90, modulesAllowed: ["iavipcom"] },

    planesteborg7diascom: { days: 30, modulesAllowed: ["comunica"] },
    planesteborg7diasvts: { days: 30, modulesAllowed: ["ventas"] },
    evaluatuerp: { days: 39, modulesAllowed: ["erpev"] },

    planesteborg7diasbund: { days: 30, modulesAllowed: ["comunica", "ventas"] },
    vippremium: { days: 90, modulesAllowed: ["comunica", "ventas", "iavipcom"] },
    esteborgmaster: { days: 360, modulesAllowed: ["comunica", "ventas", "iavipcom", "erpev"] },
  };

  return plans[planKey] || null;
}

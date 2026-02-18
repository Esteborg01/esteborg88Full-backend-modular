// src/core/planCatalog.mjs
export function getPlanConfig(planKey) {
  const plans = {
    // 30 días (módulos individuales)
    planesteborg7diascom: { days: 30, modulesAllowed: ["comunica"] }, // (nombre raro, pero respetamos tu ID)
    planesteborg7diasvts: { days: 30, modulesAllowed: ["ventas"] },
    evaluatuerp:          { days: 30, modulesAllowed: ["erpev"] },

    // 90 días (IA VIP y Premium)
    planesteborgiaexperto: { days: 90, modulesAllowed: ["iavipcom"] }, // asumiendo que “IA Experto” = IA VIP
    vippremium:            { days: 90, modulesAllowed: ["iavipcom"] }, // si Premium incluye más, aquí lo cambiamos

    // Coaching 1 hr (no expira “acceso a agendar”)
    planesteborgcoach1hr:  { days: 3650, modulesAllowed: ["coach1hr"] },

    // Master = tu sección de prueba (NO se vende)
    esteborgmaster:        { days: 3650, modulesAllowed: ["comunica","ventas","iavipcom","erpev"] },
  };

  return plans[planKey] || null;
}


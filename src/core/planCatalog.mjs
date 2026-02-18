// src/core/planCatalog.mjs
export function getPlanConfig(planKey) {
  const plans = {
    // 30 días (módulos individuales)
    planesteborg7diascom: { days: 30, modulesAllowed: ["comunica"] }, // tu ID se llama 7dias, pero dura 30
    planesteborg7diasvts: { days: 30, modulesAllowed: ["ventas"] },
    evaluatuerp:          { days: 30, modulesAllowed: ["erpev"] },

    // 90 días
    planesteborgiaexperto: { days: 90, modulesAllowed: ["iavipcom"] }, // IA VIP
    vippremium:            { days: 90, modulesAllowed: ["iavipcom", "comunica", "ventas"] }, // ✅ YA

    // Coaching 1 hr (acceso a agendar, no expira “pronto”)
    planesteborgcoach1hr:  { days: 3650, modulesAllowed: ["coach1hr"] },

    // Master = tu prueba personal (no se vende)
    esteborgmaster:        { days: 3650, modulesAllowed: ["comunica","ventas","iavipcom","erpev"] },
  };

  return plans[planKey] || null;
}

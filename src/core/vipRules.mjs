// src/core/vipRules.mjs

export const PLAN_CATALOG = {
  planesteborgiaexperto: { days: 90, modules: ["iavipcom"] },

  planesteborg30diascom: { days: 30, modules: ["comunica"] },
  planesteborg30diasvts: { days: 30, modules: ["ventas"] },
  evaluatuerp: { days: 30, modules: ["erpev"] },

  // ✅ FIX: bundle = 60 días
  planesteborg30diasbund: { days: 60, modules: ["ventas", "comunica"] },

  // bundles grandes
  vippremium: { days: 90, modules: ["iavipcom", "ventas", "comunica"] },
  esteborgmaster: { days: 90, modules: ["iavipcom", "ventas", "comunica", "erpev"] },

  // coaching = servicio, NO da módulos VIP (si quieres que sí, lo cambiamos aquí)
  planesteborgcoach1hr: { days: 0, modules: [] },
};

export function getVipDurationDays(plan) {
  return PLAN_CATALOG?.[plan]?.days ?? 0;
}

export function getModulesForPlan(plan) {
  const mods = PLAN_CATALOG?.[plan]?.modules;
  return Array.isArray(mods) ? mods : [];
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d;
}

export function isVipActive(vipExpiresAt) {
  if (!vipExpiresAt) return false;
  return new Date(vipExpiresAt).getTime() > Date.now();
}

/**
 * Regla de renovación:
 * - si el usuario todavía está activo, extendemos desde su vipExpiresAt
 * - si ya venció, extendemos desde hoy
 */
export function computeRenewedExpiry(currentVipExpiresAt, daysToAdd) {
  const now = new Date();
  const cur = currentVipExpiresAt ? new Date(currentVipExpiresAt) : null;
  const base = cur && cur.getTime() > now.getTime() ? cur : now;
  return addDays(base, daysToAdd);
}

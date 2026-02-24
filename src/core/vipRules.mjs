export function getVipDurationDays(plan) {
  // VIP normal = 30 días, VIP IA = 90 días
  if (plan === "ia90") return 90;
  return 30;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function isVipActive(vipExpiresAt) {
  if (!vipExpiresAt) return false;
  return new Date(vipExpiresAt).getTime() > Date.now();
}

// src/utils/tokken.mjs

import jwt from "jsonwebtoken";

// 🔐 Llave secreta — la misma que usas en tus otros módulos
const SECRET = process.env.ESTEBORG_TOKKEN_SECRET || "ESTEBORG_PREMIUM_2026";

// Verifica y decodifica Tokken Esteborg Members VIP
export function verifyTokken(tokken) {
  try {
    if (!tokken) return { valid: false, reason: "missing" };

    const decoded = jwt.verify(tokken, SECRET);

    return {
      valid: true,
      userId: decoded.userId || null,
      plan: decoded.plan || "vip",
      exp: decoded.exp,
    };
  } catch (err) {
    return { valid: false, reason: "invalid" };
  }
}

// src/utils/tokken.mjs

// Genera el Tokken Esteborg Members
export function generateTokkenForUser({
  email,
  personUid = "",
  accountUid = "",
}) {
  if (!email) {
    throw new Error("generateTokkenForUser: email es requerido");
  }

  const payload = {
    email,
    personUid,
    accountUid,
    ts: Date.now(),
  };

  const json = JSON.stringify(payload);
  const token = Buffer.from(json, "utf8").toString("base64url");

  return token;
}

// Valida el Tokken que llega desde el frontend / GPTs
export function validateTokken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") {
    return {
      status: "missing",
      isValid: false,
      reason: "missing_token",
    };
  }

  try {
    const decoded = Buffer.from(rawToken, "base64url").toString("utf8");
    const data = JSON.parse(decoded);

    const { email, personUid = "", accountUid = "", ts } = data || {};

    if (!email) {
      return {
        status: "invalid",
        isValid: false,
        reason: "missing_email",
        raw: data,
      };
    }

    return {
      status: "valid",
      isValid: true,
      email,
      personUid,
      accountUid,
      ts,
      raw: data,
    };
  } catch (err) {
    console.error("validateTokken error:", err);

    return {
      status: "invalid",
      isValid: false,
      reason: "parse_error",
    };
  }
}

// 🔥 Alias retrocompatible para no romper rutas viejas
export const verifyTokken = validateTokken;

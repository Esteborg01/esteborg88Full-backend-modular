// src/utils/tokken.mjs

// Genera el Tokken Esteborg Members (el mismo formato que ya usas)
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

  // Usamos base64url para evitar caracteres raros
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

    // 🧠 Aquí podrías meter validaciones de expiración si quieres después
    // De momento solo verificamos que el formato sea correcto y tenga email.

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

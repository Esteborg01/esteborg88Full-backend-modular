// src/utils/tokken.mjs

// Genera un Tokken en base64-url con email y metadatos opcionales
export function generateTokkenForUser({ email, personUid = "", accountUid = "" }) {
  if (!email) {
    throw new Error("email requerido para generar Tokken");
  }

  const payload = {
    email,
    personUid,
    accountUid,
    ts: Date.now(),
  };

  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

// Valida un Tokken generado arriba
export function validateTokken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") {
    return {
      ok: false,
      reason: "missing_token",
      tokenInfo: null,
    };
  }

  let decoded;
  try {
    const buf = Buffer.from(rawToken, "base64url");
    decoded = buf.toString("utf8");
  } catch (err) {
    console.error("❌ validateTokken: error al decodificar base64:", err);
    return {
      ok: false,
      reason: "invalid_base64",
      tokenInfo: null,
    };
  }

  let data;
  try {
    data = JSON.parse(decoded);
  } catch (err) {
    console.error("❌ validateTokken: error al parsear JSON:", err);
    return {
      ok: false,
      reason: "invalid_json",
      tokenInfo: null,
    };
  }

  const { email, personUid = "", accountUid = "", ts } = data || {};

  if (!email) {
    return {
      ok: false,
      reason: "missing_email",
      tokenInfo: data,
    };
  }

  return {
    ok: true,
    reason: "ok",
    tokenInfo: {
      email,
      personUid,
      accountUid,
      ts,
    },
  };
}

// src/utils/tokken.mjs

// 1) Genera tokken (para /generate-token)
export function generateTokkenForUser({ email, personUid = "", accountUid = "" }) {
  if (!email) throw new Error("email_required");

  const payload = {
    email,
    personUid,
    accountUid,
    ts: Date.now(),
  };

  // base64url evita caracteres raros en URL/headers
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

// 2) Valida tokken (para TODOS los módulos)
export function validateTokken(rawToken) {
  if (!rawToken) {
    return { valid: false, reason: "missing" };
  }

  try {
    const json = Buffer.from(rawToken, "base64url").toString("utf8");
    const data = JSON.parse(json);

    // requisito mínimo
    if (!data?.email) {
      return { valid: false, reason: "invalid_payload" };
    }

    return { valid: true, data };
  } catch (err) {
    return { valid: false, reason: "decode_error" };
  }
}

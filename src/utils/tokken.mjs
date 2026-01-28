// src/utils/tokken.mjs
// =======================================================
//     Generación y Validación de Tokken Esteborg
// =======================================================

// ============================
// GENERAR TOKEN
// ============================
export function generateTokkenForUser({ email, personUid = "", accountUid = "" }) {
  try {
    const payload = {
      email: email || "",
      personUid,
      accountUid,
      ts: Date.now()
    };

    const json = JSON.stringify(payload);
    const base64 = Buffer.from(json).toString("base64url");

    return base64;
  } catch (err) {
    console.error("❌ Error generando tokken:", err);
    return null;
  }
}

// ============================
// VALIDAR TOKEN
// ============================
export function validateTokken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") {
    return { ok: false, error: "no_token" };
  }

  try {
    const json = Buffer.from(rawToken, "base64url").toString("utf8");
    const data = JSON.parse(json);

    if (!data.email) {
      return { ok: false, error: "invalid_email" };
    }

    // Para VIP: aceptamos personUid y accountUid vacíos
    return {
      ok: true,
      data
    };

  } catch (err) {
    console.error("❌ Error validando tokken:", err);
    return { ok: false, error: "parse_error" };
  }
}

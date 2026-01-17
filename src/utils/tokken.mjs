// src/utils/tokken.mjs

/**
 * Genera el Tokken Esteborg EXACTO del backend anterior.
 * Base64(JSON): email, personUid, accountUid, ts (timestamp).
 */

export function generateTokkenForUser({ email, personUid, accountUid }) {
  if (!email || !personUid || !accountUid) {
    throw new Error("Faltan campos obligatorios para generar tokken");
  }

  const ts = Date.now(); // timestamp actual

  const payload = {
    email,
    personUid,
    accountUid,
    ts,
  };

  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json, "utf8").toString("base64");

  return base64;
}

/**
 * Valida un tokken EXACTAMENTE como el backend anterior.
 * - decodifica base64
 * - valida JSON
 * - valida campos
 * - valida antigüedad 24h
 */
export function validateTokken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") {
    return { status: "invalid", reason: "missing_token" };
  }

  let data = null;

  try {
    const json = Buffer.from(rawToken, "base64").toString("utf8");
    data = JSON.parse(json);
  } catch (err) {
    console.error("❌ Error decodificando Tokken:", err);
    return { status: "invalid", reason: "invalid_format" };
  }

  const { email, personUid, accountUid, ts } = data;

  if (!email || !personUid || !accountUid || !ts) {
    return { status: "invalid", reason: "missing_fields", raw: data };
  }

  // Validación de expiración (24 horas)
  const now = Date.now();
  const maxAgeMs = 24 * 60 * 60 * 1000;
  const age = now - ts;

  if (age < 0) {
    return { status: "invalid", reason: "future_timestamp", raw: data };
  }

  if (age > maxAgeMs) {
    return { status: "invalid", reason: "expired", raw: data };
  }

  return { status: "valid", raw: data };
}

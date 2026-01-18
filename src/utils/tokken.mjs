// src/utils/tokken.mjs

const MAX_TOKEN_AGE_DAYS = 40;            // margen cómodo sobre tus 30 días
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;  // 5 minutos de diferencia de reloj

function decodeBase64Json(tokkenStr) {
  const padded = tokkenStr.padEnd(
    Math.ceil(tokkenStr.length / 4) * 4,
    "="
  );
  const jsonStr = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(jsonStr);
}

export function validateTokken(rawToken) {
  console.log("=== validateTokken() rawToken ===", rawToken);

  if (!rawToken || typeof rawToken !== "string") {
    console.warn("validateTokken: token vacío o no string");
    return {
      status: "missing",
      reason: "empty",
      tokenInfo: null,
    };
  }

  let payload;
  try {
    payload = decodeBase64Json(rawToken);
    console.log("validateTokken: Base64 JSON OK:", payload);
  } catch (err) {
    console.error("❌ Error decodificando Tokken:", err);
    return {
      status: "invalid",
      reason: "bad_base64",
      tokenInfo: null,
    };
  }

  const { email, ts } = payload;

  // 🔹 AHORA solo exigimos email + ts
  if (!email || !ts) {
    console.warn("validateTokken: faltan campos requeridos", { email, ts });
    return {
      status: "invalid",
      reason: "missing_required_claims",
      tokenInfo: payload,
    };
  }

  const tsMs = Number(ts);
  if (!Number.isFinite(tsMs)) {
    console.warn("validateTokken: ts no es numérico", { ts });
    return {
      status: "invalid",
      reason: "bad_ts",
      tokenInfo: payload,
    };
  }

  const now = Date.now();
  const ageMs = now - tsMs;

  if (ageMs < -MAX_CLOCK_SKEW_MS) {
    console.warn("validateTokken: ts está demasiado en el futuro", {
      tsMs,
      now,
    });
    return {
      status: "invalid",
      reason: "future_ts",
      tokenInfo: payload,
    };
  }

  const maxAgeMs = MAX_TOKEN_AGE_DAYS * 24 * 60 * 60 * 1000;
  if (ageMs > maxAgeMs) {
    console.warn("validateTokken: token expirado", {
      ageDays: ageMs / (24 * 60 * 60 * 1000),
    });
    return {
      status: "expired",
      reason: "expired",
      tokenInfo: payload,
    };
  }

  // 🔸 Estos warnings son suaves (no invalidan el token)
  const softMissing = {};
  if (!payload.personUid) softMissing.personUid = payload.personUid;
  if (!payload.accountUid) softMissing.accountUid = payload.accountUid;
  if (Object.keys(softMissing).length) {
    console.warn(
      "validateTokken: token sin personUid/accountUid (permitido por ahora)",
      softMissing
    );
  }

  return {
    status: "valid",
    reason: "ok",
    tokenInfo: payload,
  };
}

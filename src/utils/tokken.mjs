// src/utils/tokken.mjs

export function validateTokken(rawToken) {
  console.log("=== validateTokken rawToken ===", rawToken);

  if (!rawToken || typeof rawToken !== "string") {
    return { status: "invalid", reason: "missing_raw_token", tokenInfo: null };
  }

  let tokenInfo = null;

  // 1) Intentar como JSON base64 (formato Esteborg clásico)
  try {
    const jsonStr = Buffer.from(rawToken, "base64").toString("utf8");
    tokenInfo = JSON.parse(jsonStr);
    console.log("validateTokken: decoded JSON-base64:", tokenInfo);
  } catch (err1) {
    console.log(
      "validateTokken: JSON-base64 falló, probando como JWT…",
      err1.message
    );

    // 2) Intentar como JWT (3 partes separadas por ".")
    try {
      const parts = rawToken.split(".");
      if (parts.length >= 2) {
        const payloadB64 = parts[1]; // parte central
        const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
        tokenInfo = JSON.parse(payloadJson);
        console.log("validateTokken: decoded JWT payload:", tokenInfo);
      }
    } catch (err2) {
      console.log("validateTokken: JWT decode también falló:", err2.message);
      return {
        status: "invalid",
        reason: "decode_error",
        tokenInfo: null,
      };
    }
  }

  if (!tokenInfo) {
    return { status: "invalid", reason: "empty_decoded", tokenInfo: null };
  }

  // Normalizar campos principales
  const {
    email,
    Email,
    personUid,
    PersonUid,
    accountUid,
    AccountUid,
    ts,
  } = tokenInfo;

  const resolvedEmail = email || Email || "";
  const resolvedPersonUid = personUid || PersonUid || "";
  const resolvedAccountUid = accountUid || AccountUid || "";

  if (!resolvedEmail || !resolvedPersonUid || !resolvedAccountUid) {
    return {
      status: "invalid",
      reason: "missing_claims",
      tokenInfo,
    };
  }

  // Manejo flexible de ts (segundos o milisegundos)
  const nowMs = Date.now();
  let tokenTsMs = null;

  if (typeof ts === "number") {
    // si es muy grande (~ > año 2033 en segundos) asumimos que ya viene en ms
    tokenTsMs = ts > 2e10 ? ts : ts * 1000;
  }

  if (tokenTsMs) {
    const ageMs = nowMs - tokenTsMs;
    const MAX_AGE_MS = 40 * 24 * 60 * 60 * 1000; // 40 días

    if (ageMs < 0 || ageMs > MAX_AGE_MS) {
      return {
        status: "invalid",
        reason: "expired",
        tokenInfo,
      };
    }
  }

  // 🔴 AQUÍ ya tienes tokenInfo decodificado y "sano".
  //     Si tienes lógica extra de membresía (consultar Outseta, DB, etc.),
  //     déjala abajo de este comentario.

  // Por ahora devolvemos valid=ok y dejamos que tu lógica de negocio lo refine:
  return {
    status: "valid",
    reason: "ok",
    tokenInfo,
  };
}

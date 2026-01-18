// =====================================================================================
//  Esteborg — Token Utils (tokken.mjs FINAL)
//  Compatible con:
//    • Tokens Base64 JSON (formato Esteborg clásico)
//    • JWT (Outseta access_token)
// =====================================================================================

/**
 * =====================================================
 *  VALIDAR TOKEN (NUEVO)
 *  - Detecta formato
 *  - Decodifica JSON Base64
 *  - Decodifica JWT
 *  - Valida campos requeridos
 *  - Valida antigüedad (40 días)
 * =====================================================
 */
export function validateTokken(rawToken) {
  console.log("=== validateTokken() rawToken ===", rawToken);

  if (!rawToken || typeof rawToken !== "string") {
    console.log("validateTokken: no rawToken");
    return { status: "invalid", reason: "missing_raw_token", tokenInfo: null };
  }

  let tokenInfo = null;

  // -----------------------------------------------------
  // 1) INTENTAR DECODIFICAR COMO JSON-BASE64 (Esteborg)
  // -----------------------------------------------------
  try {
    const jsonStr = Buffer.from(rawToken, "base64").toString("utf8");
    tokenInfo = JSON.parse(jsonStr);
    console.log("validateTokken: Base64 JSON OK:", tokenInfo);
  } catch (err1) {
    console.log("validateTokken: Base64 JSON falló → probando JWT…", err1.message);

    // -----------------------------------------------------
    // 2) INTENTAR COMO JWT (Outseta access_token)
    // -----------------------------------------------------
    try {
      const parts = rawToken.split(".");
      if (parts.length >= 2) {
        const payloadB64 = parts[1];
        const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
        tokenInfo = JSON.parse(payloadJson);
        console.log("validateTokken: JWT OK:", tokenInfo);
      }
    } catch (err2) {
      console.log("validateTokken: JWT también falló:", err2.message);
      return { status: "invalid", reason: "decode_error", tokenInfo: null };
    }
  }

  if (!tokenInfo) {
    console.log("validateTokken: tokenInfo vacío");
    return { status: "invalid", reason: "empty_tokeninfo", tokenInfo: null };
  }

  // Campos admitidos (Outseta y Esteborg)
  const {
    email, Email,
    personUid, PersonUid,
    accountUid, AccountUid,
    ts
  } = tokenInfo;

  const resolvedEmail = email || Email || "";
  const resolvedPersonUid = personUid || PersonUid || "";
  const resolvedAccountUid = accountUid || AccountUid || "";

  // -----------------------------------------------------
  // VALIDAR CAMPOS BÁSICOS
  // -----------------------------------------------------
  if (!resolvedEmail || !resolvedPersonUid || !resolvedAccountUid) {
    console.log("validateTokken: missing_claims", {
      email: resolvedEmail, personUid: resolvedPersonUid, accountUid: resolvedAccountUid
    });

    return {
      status: "invalid",
      reason: "missing_claims",
      tokenInfo
    };
  }

  // -----------------------------------------------------
  // VALIDAR ANTIGÜEDAD (ts en ms o segundos)
  // -----------------------------------------------------
  const nowMs = Date.now();
  let tokenTsMs = null;

  if (typeof ts === "number") {
    // Si ts es demasiado chico, seguramente está en segundos
    tokenTsMs = ts > 2e10 ? ts : ts * 1000;
  }

  if (tokenTsMs) {
    const ageMs = nowMs - tokenTsMs;
    const MAX_AGE_MS = 40 * 24 * 60 * 60 * 1000; // 40 días

    if (ageMs < 0 || ageMs > MAX_AGE_MS) {
      console.log("validateTokken: token expirado");
      return { status: "invalid", reason: "expired", tokenInfo };
    }
  }

  // Token válido
  console.log("validateTokken: TOKEN VÁLIDO 🎉");
  return {
    status: "valid",
    reason: "ok",
    tokenInfo
  };
}



/**
 * =====================================================
 *  GENERAR TOKEN ESTEBORG (LEGACY)
 *  Esto evita que truene el import en tokkenRoutes.mjs.
 *  Lo dejamos compatible con validateTokken.
 * =====================================================
 */
export function generateTokkenForUser({ email, personUid, accountUid, ts }) {
  const payload = {
    email: email || "",
    personUid: personUid || "",
    accountUid: accountUid || "",
    ts: ts || Date.now()
  };

  const jsonStr = JSON.stringify(payload);
  const base64 = Buffer.from(jsonStr, "utf8").toString("base64");

  console.log("generateTokkenForUser payload:", payload);
  console.log("generateTokkenForUser base64 (preview):", base64.slice(0, 40) + "...");

  return base64;
}


// =====================================================================================
// FIN DEL ARCHIVO
// =====================================================================================

// src/utils/tokken.mjs
// ✅ Validador unificado para Tokken Esteborg Members (compat total)
// - Soporta JWT Outseta: header.payload.signature
// - Soporta legacy: base64url(JSON)
// - IMPORTANTE: NO async (tus módulos lo usan sin await)

const SAFE_CLOCK_SKEW_SEC = 60; // tolerancia 1 min

function base64UrlToString(b64url) {
  const raw = String(b64url || "").trim();
  const padded =
    raw.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((raw.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function parseJwtPayload(token) {
  const parts = String(token || "").trim().split(".");
  if (parts.length < 2) return null;
  try {
    const payloadStr = base64UrlToString(parts[1]);
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

function parseLegacyJsonToken(token) {
  try {
    const jsonStr = base64UrlToString(String(token || "").trim());
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function extractEmail(payload) {
  if (!payload || typeof payload !== "object") return null;
  return (
    payload.email ||
    payload.Email ||
    payload.userEmail ||
    payload.user?.email ||
    payload.profile?.email ||
    null
  );
}

function isExpired(payload) {
  const now = Math.floor(Date.now() / 1000);
  const exp = payload?.exp;
  if (!exp) return false;
  return now > Number(exp) + SAFE_CLOCK_SKEW_SEC;
}

// ✅ COMPAT: tus routes esperan tokenResult.status y tokenResult.raw
function makeResult(valid, reason, tokenInfo = {}) {
  return {
    // formato viejo esperado por routes:
    status: valid ? "valid" : "invalid",
    raw: tokenInfo,

    // formato nuevo (útil):
    valid,
    reason,
    tokenInfo,
  };
}

// ✅ NO async (porque tus rutas NO hacen await)
export function validateTokken(token) {
  const raw = String(token || "").trim();

  if (!raw || raw.length < 10) {
    return makeResult(false, "missing_token", {});
  }

  // 1) JWT
  if (raw.includes(".")) {
    const jwtPayload = parseJwtPayload(raw);
    if (!jwtPayload) return makeResult(false, "unreadable_jwt", {});

    if (isExpired(jwtPayload)) {
      return makeResult(false, "expired", { email: extractEmail(jwtPayload) || null });
    }

    return makeResult(true, "jwt_ok", {
      email: extractEmail(jwtPayload) || null,
      sub: jwtPayload.sub || null,
      exp: jwtPayload.exp || null,
      iss: jwtPayload.iss || null,
    });
  }

  // 2) Legacy base64url(JSON)
  const legacy = parseLegacyJsonToken(raw);
  if (legacy) {
    return makeResult(true, "legacy_ok", {
      email: extractEmail(legacy) || null,
      sub: legacy.sub || null,
      exp: legacy.exp || null,
    });
  }

  return makeResult(false, "unreadable", {});
}

// Compat por si algún módulo usa verifyTokken
export function verifyTokken(token) {
  return validateTokken(token);
}

// Compat: generateTokkenForUser a veces se llama con objeto {email,...}
export function generateTokkenForUser(input) {
  const email =
    typeof input === "string"
      ? input
      : (input?.email || "").toString();

  const payload = {
    email: email.trim() || null,
    iat: Math.floor(Date.now() / 1000),
  };

  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

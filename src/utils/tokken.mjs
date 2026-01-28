// src/utils/tokken.mjs
// Validador unificado para Tokken Esteborg Members
// - NO usa jsonwebtoken (no dependencias extra)
// - Soporta JWT tipo Outseta: header.payload.signature
// - Soporta token legacy: base64url(JSON)

const SAFE_CLOCK_SKEW_SEC = 60; // tolerancia 1 min

function base64UrlToString(b64url) {
  const padded = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
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
  // legacy: token = base64url(JSON)
  try {
    const raw = String(token || "").trim();
    const jsonStr = base64UrlToString(raw);
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
  if (!exp) return false; // si no trae exp, no lo invalidamos
  return now > (Number(exp) + SAFE_CLOCK_SKEW_SEC);
}

export async function validateTokken(token) {
  const raw = String(token || "").trim();

  if (!raw || raw.length < 10) {
    return { valid: false, reason: "missing_token", tokenInfo: {} };
  }

  // 1) JWT (Outseta típico)
  const jwtPayload = raw.includes(".") ? parseJwtPayload(raw) : null;
  if (jwtPayload) {
    if (isExpired(jwtPayload)) {
      return { valid: false, reason: "expired", tokenInfo: { email: extractEmail(jwtPayload) || null } };
    }
    const email = extractEmail(jwtPayload);
    // JWT válido “estructuralmente” (sin verificar firma)
    return {
      valid: true,
      reason: "jwt_ok",
      tokenInfo: {
        email: email || null,
        sub: jwtPayload.sub || null,
        exp: jwtPayload.exp || null,
        iss: jwtPayload.iss || null,
      },
    };
  }

  // 2) Legacy base64url(JSON)
  const legacy = parseLegacyJsonToken(raw);
  if (legacy) {
    const email = extractEmail(legacy);
    return {
      valid: true,
      reason: "legacy_ok",
      tokenInfo: {
        email: email || null,
        sub: legacy.sub || null,
        exp: legacy.exp || null,
      },
    };
  }

  return { valid: false, reason: "unreadable", tokenInfo: {} };
}

// Compat: algunos routes estaban importando verifyTokken
export async function verifyTokken(token) {
  return validateTokken(token);
}

// Compat: tokkenRoutes estaba importando generateTokkenForUser.
// Genera token "legacy" (base64url JSON). No es JWT, pero sirve para pruebas internas.
export function generateTokkenForUser(email) {
  const payload = {
    email: String(email || "").trim() || null,
    iat: Math.floor(Date.now() / 1000),
  };
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64");
  // a base64url
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// src/utils/tokken.mjs
// Generar y validar Tokken Esteborg Members de forma simple y consistente

// Genera un tokken base64 a partir de los datos del usuario
export function generateTokkenForUser({ email, personUid = "", accountUid = "" }) {
  if (!email) {
    throw new Error("generateTokkenForUser: email es requerido");
  }

  const payload = {
    email,
    personUid: personUid || "",
    accountUid: accountUid || "",
    ts: Date.now(), // timestamp en ms
  };

  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64");
}

// Valida un tokken base64 y devuelve estatus + datos
export function validateTokken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") {
    return {
      ok: false,
      status: "missing",
      reason: "Tokken vacío o no enviado",
      tokenInfo: null,
    };
  }

  let parsed;
  try {
    // Normalizar por si viene en base64-url
    const normalized = rawToken.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    parsed = JSON.parse(json);
  } catch (err) {
    console.error("[TOKKEN] Error decodificando tokken:", err);
    return {
      ok: false,
      status: "invalid_format",
      reason: "Tokken no es base64 JSON válido",
      tokenInfo: null,
    };
  }

  const { email, personUid = "", accountUid = "", ts } = parsed;

  if (!email) {
    return {
      ok: false,
      status: "invalid_payload",
      reason: "Tokken sin email",
      tokenInfo: parsed,
    };
  }

  // Validación suave de tiempo (opcional, no bloqueante si falta ts)
  if (typeof ts === "number") {
    const maxAgeMs = 120 * 24 * 60 * 60 * 1000; // 120 días
    const age = Date.now() - ts;

    if (age < -5 * 60 * 1000) {
      return {
        ok: false,
        status: "invalid_timestamp",
        reason: "Tokken con timestamp en el futuro",
        tokenInfo: parsed,
      };
    }

    if (age > maxAgeMs) {
      return {
        ok: false,
        status: "expired",
        reason: "Tokken expirado",
        tokenInfo: parsed,
      };
    }
  }

  // Permitimos personUid/accountUid vacíos por ahora
  return {
    ok: true,
    status: "ok",
    reason: null,
    tokenInfo: { email, personUid, accountUid, ts },
  };
}

// src/utils/tokken.mjs

export function decodeTokken(rawToken) {
  try {
    const json = Buffer.from(rawToken, "base64").toString("utf8");
    const data = JSON.parse(json);
    return data;
  } catch (err) {
    console.error("❌ Error decodificando Tokken:", err);
    return null;
  }
}

export function validateTokken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") {
    return { status: "invalid", reason: "missing_token" };
  }

  const data = decodeTokken(rawToken);
  if (!data) {
    return { status: "invalid", reason: "invalid_format" };
  }

  const { email, personUid, accountUid, ts } = data;

  if (!email || !personUid || !accountUid || !ts) {
    return { status: "invalid", reason: "missing_fields", raw: data };
  }

  const now = Date.now();
  const maxAgeMs = 24 * 60 * 60 * 1000; // 24 horas
  const age = now - ts;

  if (age < 0) {
    return { status: "invalid", reason: "future_timestamp", raw: data };
  }

  if (age > maxAgeMs) {
    return { status: "invalid", reason: "expired", raw: data };
  }

  return { status: "valid", raw: data };
}

// src/utils/tokken.mjs

export function validateTokken(rawToken) {
  if (!rawToken) {
    return { valid: false, reason: "missing" };
  }

  try {
    const json = Buffer.from(rawToken, "base64url").toString("utf8");
    const data = JSON.parse(json);

    if (!data.email) {
      return { valid: false, reason: "invalid_payload" };
    }

    return { valid: true, data };
  } catch (err) {
    return { valid: false, reason: "decode_error" };
  }
}

// iavipcomRoutes.mjs
import { getIaVipComReply } from "../services/iavipcomService.mjs";
// src/modules/iavipcomRoutes.mjs
import { validateTokken } from "../utils/tokken.mjs";

export function registerIaVipComRoutes(app, openai) {
  app.post("/api/modules/iavipcom", async (req, res) => {
    try {
      const { message, rawToken, history = [], userName, lang = "es" } = req.body;

      const tokenStatus = validateTokken(rawToken);
      if (!tokenStatus.valid) {
        return res.json({
          reply: "Necesito tu Tokken Esteborg Members para continuar.",
          tokenStatus: "invalid",
          tokenInfo: tokenStatus
        });
      }

      const reply = await getIaVipComReply(openai, {
        message,
        history,
        userName,
        lang
      });

      return res.json({
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenStatus
      });
    } catch (err) {
      console.error("Error IA VIP:", err);
      res.status(500).json({ error: "Error interno en IA VIP." });
    }
  });
}
// Valida el formato básico del Tokken Esteborg Members
export function validateTokken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") {
    return {
      valid: false,
      reason: "no_token",
    };
  }

  const normalized = rawToken.trim();

  // Reglas básicas: mínimo 12 caracteres y sin espacios
  const hasSpaces = /\s/.test(normalized);
  const isMinLength = normalized.length >= 12;

  if (!isMinLength || hasSpaces) {
    return {
      valid: false,
      reason: "format_error",
    };
  }

  return {
    valid: true,
    reason: "ok",
  };
}

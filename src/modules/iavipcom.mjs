// src/modules/iavipcom.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

export function registerIaVipComRoutes(app, openai) {
  app.post("/api/modules/iavipcom", async (req, res) => {
    try {
      // Aceptamos el token tanto en rawToken (como Com7) como en token/header
      const {
        message,
        rawToken,
        token: bodyToken,
        userName,
        history,
      } = req.body || {};

      const headerToken = req.headers["x-esteborg-token"];
      const effectiveToken = rawToken || bodyToken || headerToken;

      const tokenResult = validateTokken(effectiveToken);

      // ❌ Tokken inválido / vencido / ausente → mensaje de bienvenida pidiendo Tokken
      if (tokenResult.status !== "valid") {
        const fallbackReply =
          "¡Qué gusto saludarte! 😊 Antes de entrar a tu entrenamiento necesito tu Tokken Esteborg Members para validar tu acceso.\n\n" +
          "Si aún no tienes token, puedes obtenerlo o recuperarlo en:\n" +
          "https://membersvip.esteborg.live/#miembrosvip\n\n" +
          "1️⃣ Pega aquí tu Tokken Esteborg Members.\n" +
          "2️⃣ Después dime cómo te llamas y qué quieres lograr con IA en los próximos 90 días.";

        return res.json({
          module: "iavipcom",
          reply: fallbackReply,
          tokenStatus: tokenResult.status,
          tokenInfo: tokenResult,
        });
      }

      // ✅ Tokken válido → seguimos con el flujo normal
      if (!message || typeof message !== "string") {
        return res.status(400).json({
          error: "missing_message",
          message: "Falta el mensaje del usuario.",
        });
      }

      const reply = await getIaVipComReply(openai, {
  message,
  history: history || [],
  userName,
});

// Devolvemos el history actualizado tal como hace COM7
const updatedHistory = [
  ...(history || []),
  { role: "user", content: message },
  { role: "assistant", content: reply }
];

return res.json({
  module: "iavipcom",
  reply,
  tokenStatus: "valid",
  tokenInfo: tokenResult.tokenInfo,
  history: updatedHistory,   // ← ESTO HACE QUE YA NO REPITA
});

    }
  });
}

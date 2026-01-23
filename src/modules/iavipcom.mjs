// src/modules/iavipcom.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

export function registerIaVipComRoutes(app, openai) {
  app.post("/api/modules/iavipcom", async (req, res) => {
    try {
      // Aceptamos el token en varios lugares (igual que Com7)
      const {
        message,
        rawToken,
        token: bodyToken,
        userName,
        history,
      } = req.body || {};

      const headerToken = req.headers["x-esteborg-token"];
      const effectiveToken = rawToken || bodyToken || headerToken || null;

      const tokenResult = validateTokken(effectiveToken);

      const safeHistory = Array.isArray(history) ? history : [];

      // ❌ Tokken inválido / vencido / ausente → mensaje de bienvenida pidiendo Tokken
      if (tokenResult.status !== "valid") {
        const fallbackReply = `¡Qué gusto saludarte! 😊 Antes de entrar a tu entrenamiento necesito tu Tokken Esteborg Members para validar tu acceso.

Si aún no tienes token, puedes obtenerlo o recuperarlo en:
https://membersvip.esteborg.live/#miembrosvip

1️⃣ Pega aquí tu Tokken Esteborg Members.
2️⃣ Después dime cómo te llamas y qué quieres lograr con IA en los próximos 90 días.`;

        const updatedHistory = [
          ...safeHistory,
          { role: "assistant", content: fallbackReply },
        ];

        return res.json({
          module: "iavipcom",
          reply: fallbackReply,
          tokenStatus: tokenResult.status,
          tokenInfo: tokenResult,
          history: updatedHistory,
        });
      }

      // ✅ Tokken válido → necesitamos mensaje
      if (!message || typeof message !== "string") {
        return res.status(400).json({
          error: "missing_message",
          message: "Falta el mensaje del usuario.",
        });
      }

      // Llamamos al servicio IA usando history (como en COM7)
      const reply = await getIaVipComReply(openai, {
        message,
        history: safeHistory,
        userName,
      });

      const updatedHistory = [
        ...safeHistory,
        { role: "user", content: message },
        { role: "assistant", content: reply },
      ];

      return res.json({
        module: "iavipcom",
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult.tokenInfo,
        history: updatedHistory,
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/iavipcom:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en el módulo Esteborg IA - Despliega todo tu poder.",
      });
    }
  });
}

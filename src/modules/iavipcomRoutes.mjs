// src/modules/iavipcomRoutes.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

export function registerIaVipComRoutes(app, openai) {
  app.post("/api/modules/iavipcom", async (req, res) => {
    try {
      const { message, rawToken, userName, history } = req.body || {};

      const tokenResult = validateTokken(rawToken);

      if (tokenResult.status !== "valid") {
        const fallbackReply =
          "¡Qué gusto saludarte! 😊 Antes de comenzar necesito tu Token Esteborg Members para validar tu acceso.\n" +
          "Pégalo aquí abajo ⬇️\n\n" +
          "Si aún no tienes token, puedes obtenerlo o recuperarlo en: https://membersvip.esteborg.live/#miembrosvip";

        return res.json({
          module: "iavipcom",
          reply: fallbackReply,
          tokenStatus: "invalid",
          tokenInfo: tokenResult,
        });
      }

      const reply = await getIaVipComReply(openai, {
        message,
        history,
        userName,
      });

      return res.json({
        module: "iavipcom",
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult.raw,
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/iavipcom:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en el módulo Esteborg IA VIP.",
      });
    }
  });
}

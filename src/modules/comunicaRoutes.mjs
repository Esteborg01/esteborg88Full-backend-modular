// src/modules/comunicaRoutes.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getCom7Reply } from "../services/comunicaService.mjs";

export function registerComunicaRoutes(app, openai) {
  app.post("/api/modules/comunica", async (req, res) => {
    try {
      const { message, rawToken, userName, history } = req.body || {};

      const tokenResult = validateTokken(rawToken);

      if (tokenResult.status !== "valid") {
        const fallbackReply =
          "¡Qué gusto saludarte! 😊 Puedes hablarme o escribirme. ¿Cómo te llamas?\n" +
          "Antes de comenzar, necesito tu Token Esteborg Members para validar tu acceso.\n" +
          "Pégalo aquí abajo ⬇️\n\n" +
          "Si aún no tienes token, puedes obtenerlo o recuperarlo en: https://membersvip.esteborg.live/#miembrosvip";

        return res.json({
          module: "comunica",
          reply: fallbackReply,
          tokenStatus: "invalid",
          tokenInfo: tokenResult,
        });
      }

      const reply = await getCom7Reply(openai, {
        message,
        history,
        userName,
      });

      return res.json({
        module: "comunica",
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult.raw,
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/comunica:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en el módulo EsteborgCom7 (Comunicación con IE).",
      });
    }
  });
}

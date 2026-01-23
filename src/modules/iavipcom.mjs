// src/modules/iavipcom.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

export function registerIaVipComRoutes(app, openai) {
  app.post("/api/modules/iavipcom", async (req, res) => {
    try {
      const { message, rawToken, userName, history } = req.body || {};

      const tokenResult = validateTokken(rawToken);

      if (tokenResult.status !== "valid") {
        const fallbackReply =
          "¡Qué gusto saludarte! 😊 Puedes hablarme o escribirme.\n" +
          "Antes de comenzar tu entrenamiento en Inteligencia Artificial necesito tu Tokken Esteborg Members para validar tu acceso.\n\n" +
          "Pégalo aquí abajo ⬇️\n\n" +
          "Si aún no tienes token, puedes obtenerlo o recuperarlo en:\nhttps://membersvip.esteborg.live/#miembrosvip";

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
          "Ocurrió un error inesperado en el módulo Esteborg IA (Coach Profesional de Inteligencia Artificial).",
      });
    }
  });
}

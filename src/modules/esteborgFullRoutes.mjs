// src/modules/esteborgFullRoutes.mjs
import { validateTokken } from "../utils/tokken.mjs";
import { getEsteborgReply } from "../services/esteborgFullService.mjs";

export function registerEsteborgFullRoutes(app, openai) {
  app.post("/api/esteborg88full", async (req, res) => {
    try {
      const { message, rawToken, userName, history } = req.body || {};

      const tokenResult = validateTokken(rawToken);

      if (tokenResult.status !== "valid") {
        const fallbackReply =
          "¡Qué gusto saludarte! 😊 Puedes hablarme o escribirme. ¿Cómo te llamas?\n" +
          "Antes de comenzar, necesito tu Tokken Esteborg Members para validar tu acceso.\n" +
          "Pégalo aquí abajo ⬇️";

        return res.json({
          reply: fallbackReply,
          tokenStatus: "invalid",
          tokenInfo: tokenResult,
        });
      }

      const reply = await getEsteborgReply(openai, {
        message,
        history,
        userName,
      });

      return res.json({
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult.raw,
      });
    } catch (err) {
      console.error("❌ Error en /api/esteborg88full:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en el backend de Esteborg88Full.",
      });
    }
  });
}

// src/modules/ventasRoutes.mjs
import { validateTokken } from "../utils/tokken.mjs";
import { getVentasReply } from "../services/ventasService.mjs";

export function registerVentasRoutes(app, openai) {
  app.post("/api/modules/ventas", async (req, res) => {
    try {
      const { message, rawToken, userName, history } = req.body || {};

      const tokenResult = validateTokken(rawToken);

      if (tokenResult.status !== "valid") {
        const fallbackReply =
          "Bienvenido a EsteborgVts7: Comunicación de Negocios Avanzada y Ventas Consultivas 🧠💼\n\n" +
          "Antes de iniciar tu entrenamiento premium de 7 días, necesito validar tu **Token Esteborg Members**.\n" +
          "Pega tu token aquí abajo para activar tu acceso exclusivo.\n\n" +
          "Sin token, puedo darte algunos tips generales, pero el curso completo solo está disponible en modo premium.";

        return res.json({
          module: "ventas",
          reply: fallbackReply,
          tokenStatus: "invalid",
          tokenInfo: tokenResult,
        });
      }

      const reply = await getVentasReply(openai, {
        message,
        history,
        userName,
      });

      return res.json({
        module: "ventas",
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult.raw,
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/ventas:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en EsteborgVts7 (Comunicación de negocios y ventas).",
      });
    }
  });
}

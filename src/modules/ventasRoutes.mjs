// src/modules/ventasRoutes.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getVentasReply } from "../services/ventasService.mjs";

export function registerVentasRoutes(app, openai) {
  app.post("/api/modules/ventas", async (req, res) => {
    try {
      const { message, rawToken, userName, history } = req.body || {};

      // Validación de Token VIP (idéntica a Com7)
      const tokenResult = validateTokken(rawToken);

      // Si el token NO es válido → mensaje limitado
      if (tokenResult.status !== "valid") {
        const fallbackReply =
          "Bienvenido a **EsteborgVts7 – Comunicación de Negocios Avanzada** ⚡\n\n" +
          "Este es un entrenamiento premium de 7 días llamado **«Comunica para Vender»**, diseñado para ayudarte a comunicar, conectar y monetizar con estrategia —sin descuentos agresivos ni comprar problemas.\n\n" +
          "Para desbloquear el curso completo necesito validar tu **Token Esteborg Members**.\n\n" +
          "👉 Pega tu token aquí abajo para activar tu acceso.\n" +
          "👉 Si aún no tienes token, puedes generarlo o recuperarlo en: https://membersvip.esteborg.live/#miembrosvip\n\n" +
          "Mientras tu acceso esté pendiente, solo podré darte tips básicos por seguridad.";

        return res.json({
          module: "ventas",
          reply: fallbackReply,
          tokenStatus: "invalid",
          tokenInfo: tokenResult,
        });
      }

      // Si token válido → llamada oficial al motor Vts7
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
          "Ocurrió un error inesperado en EsteborgVts7 (Comunicación de Negocios Avanzada).",
      });
    }
  });
}

// src/modules/ventasRoutes.mjs

import { requireAuth } from "../middleware/requireAuth.mjs";
import { requireVip } from "../middleware/requireVip.mjs";
import { getVentasReply } from "../services/ventasService.mjs";

export function registerVentasRoutes(app, openai) {
  app.post(
    "/api/modules/ventas",
    requireAuth,
    requireVip({ moduleKey: "ventas" }),
    async (req, res) => {
      try {
        const { message, userName, history } = req.body || {};

        if (!message || typeof message !== "string") {
          return res.status(400).json({
            ok: false,
            module: "ventas",
            error: "missing_message",
            message: "Falta el mensaje del usuario.",
          });
        }

        const reply = await getVentasReply(openai, {
          message,
          history,
          userName,
        });

        return res.json({
          ok: true,
          module: "ventas",
          reply,
          user: {
            email: req.userDb?.email,
            plan: req.userDb?.plan,
            vipExpiresAt: req.userDb?.vipExpiresAt,
          },
        });
      } catch (err) {
        console.error("❌ Error en /api/modules/ventas:", err);
        return res.status(500).json({
          ok: false,
          module: "ventas",
          error: "internal_error",
          message: "Ocurrió un error inesperado en el módulo Esteborg Ventas.",
        });
      }
    }
  );
}

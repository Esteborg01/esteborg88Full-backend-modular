// src/modules/comunicaRoutes.mjs

import { requireAuth } from "../middleware/requireAuth.mjs";
import { requireVip } from "../middleware/requireVip.mjs";
import { getCom7Reply } from "../services/comunicaService.mjs";

export function registerComunicaRoutes(app, openai) {
  app.post(
    "/api/modules/comunica",
    requireAuth,
    requireVip({ moduleKey: "comunica" }),
    async (req, res) => {
      try {
        const { message, userName, history } = req.body || {};

        if (!message || typeof message !== "string") {
          return res.status(400).json({
            ok: false,
            module: "comunica",
            error: "missing_message",
            message: "Falta el mensaje del usuario.",
          });
        }

        const reply = await getCom7Reply(openai, {
          message,
          history,
          userName,
        });

        return res.json({
          ok: true,
          module: "comunica",
          reply,
          user: {
            email: req.userDb?.email,
            plan: req.userDb?.plan,
            vipExpiresAt: req.userDb?.vipExpiresAt,
          },
        });
      } catch (err) {
        console.error("❌ Error en /api/modules/comunica:", err);
        return res.status(500).json({
          ok: false,
          module: "comunica",
          error: "internal_error",
          message:
            "Ocurrió un error inesperado en el módulo EsteborgCom7 (Comunicación con IE).",
        });
      }
    }
  );
}

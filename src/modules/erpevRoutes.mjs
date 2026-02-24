// src/modules/erpevRoutes.mjs

import { requireAuth } from "../middleware/requireAuth.mjs";
import { requireVip } from "../middleware/requireVip.mjs";
import { getErpevReply } from "../services/erpevService.mjs";

export function registerErpevRoutes(app, openai) {
  app.post(
    "/api/modules/erpev",
    requireAuth,
    requireVip({ moduleKey: "erpev" }),
    async (req, res) => {
      try {
        const { message, userName, history } = req.body || {};

        if (!message || typeof message !== "string") {
          return res.status(400).json({
            ok: false,
            module: "erpev",
            error: "missing_message",
            message: "Falta el mensaje del usuario.",
          });
        }

        const reply = await getErpevReply(openai, {
          message,
          history,
          userName,
        });

        return res.json({
          ok: true,
          module: "erpev",
          reply,
          user: {
            email: req.userDb?.email,
            plan: req.userDb?.plan,
            vipExpiresAt: req.userDb?.vipExpiresAt,
          },
        });
      } catch (err) {
        console.error("❌ Error en /api/modules/erpev:", err);
        return res.status(500).json({
          ok: false,
          module: "erpev",
          error: "internal_error",
          message: "Ocurrió un error inesperado en el módulo Esteborg ERPev.",
        });
      }
    }
  );
}

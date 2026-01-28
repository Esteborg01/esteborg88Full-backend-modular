import express from "express";
import { requireVipTokken } from "../middleware/requireVipTokken.mjs";
import { generateIaVipComResponse } from "../services/iavipcomBrain.mjs";

export function registerIaVipComRoutes(app) {
  const router = express.Router();

  // 🔐 IAvip SIEMPRE requiere Members VIP
  router.use(requireVipTokken);

  router.post("/", async (req, res) => {
    try {
      if (!req.esteborgMember) {
        return res.status(403).json({
          error: "vip_required",
          message:
            "Esteborg IA es un programa premium. Requiere Tokken Esteborg Members activo.",
        });
      }

      const { message, lang = "es" } = req.body;

      if (!message || message.trim().length < 2) {
        return res.json({
          reply: "Dime qué quieres lograr y comenzamos.",
        });
      }

      const reply = await generateIaVipComResponse({
        userMessage: message,
        lang,
        tokenData: req.esteborgTokken || {},
      });

      return res.json({
        vip: true,
        reply,
      });
    } catch (err) {
      console.error("❌ Error IA VIP TITAN:", err);
      return res.status(500).json({
        error: "iavip_error",
        message: "Error interno en Esteborg IA VIP.",
      });
    }
  });

  app.use("/api/modules/iavipcom", router);
}

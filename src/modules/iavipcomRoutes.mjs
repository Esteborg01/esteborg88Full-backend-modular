// iavipcomRoutes.mjs
import { getIaVipComReply } from "../services/iavipcomService.mjs";
// src/modules/iavipcomRoutes.mjs
import { validateTokken } from "../utils/tokken.mjs";

export function registerIaVipComRoutes(app, openai) {
  app.post("/api/modules/iavipcom", async (req, res) => {
    try {
      const { message, rawToken, history = [], userName, lang = "es" } = req.body;

      const tokenStatus = validateTokken(rawToken);
      if (!tokenStatus.valid) {
        return res.json({
          reply: "Necesito tu Tokken Esteborg Members para continuar.",
          tokenStatus: "invalid",
          tokenInfo: tokenStatus
        });
      }

      const reply = await getIaVipComReply(openai, {
        message,
        history,
        userName,
        lang
      });

      return res.json({
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenStatus
      });
    } catch (err) {
      console.error("Error IA VIP:", err);
      res.status(500).json({ error: "Error interno en IA VIP." });
    }
  });
}

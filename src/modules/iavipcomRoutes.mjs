import express from "express";
import { requireVipTokken } from "../middleware/requireVipTokken.mjs";

export function registerIaVipComRoutes(app, openai) {
  const router = express.Router();

  // 🔐 Middleware de Tokken SOLO aquí
  router.use(requireVipTokken);

  router.post("/", async (req, res) => {
    try {
      const { messages, language = "es" } = req.body;

      const isMember = req.esteborgMember === true;

      // 🔒 Control demo vs VIP
      if (!isMember) {
        return res.json({
          demo: true,
          message:
            "Estás en modo demo de Esteborg IA. Activa tu Tokken Members VIP para acceso completo.",
        });
      }

      // 🤖 Llamada OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.6,
      });

      return res.json({
        vip: true,
        response: completion.choices[0].message.content,
      });
    } catch (err) {
      console.error("❌ Error IA VIP:", err);
      return res.status(500).json({
        error: "ia_error",
        message: "Error interno en Esteborg IA",
      });
    }
  });

  app.use("/api/modules/iavipcom", router);
}

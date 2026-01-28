import express from "express";
import { getIaVipComReply } from "../services/iavipcomService.mjs";
import { validateTokken } from "../utils/tokken.mjs";

export function registerIaVipComRoutes(app) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      const { userMessage, language, tokken } = req.body;

      const validation = validateTokken(tokken);
      if (!validation.valid) {
        return res.status(401).json({ error: "Tokken inválido" });
      }

      const reply = await getIaVipComReply(userMessage, language);
      return res.json({ reply });

    } catch (error) {
      console.error("Error en ruta iavipcom:", error);
      return res.status(500).json({ error: "Error interno en IAvipCom" });
    }
  });

  app.use("/api/modules/iavipcom", router);
}

// src/modules/iavipcomRoutes.mjs
import { Router } from "express";
import { iaVipComReply } from "../services/iavipcomService.mjs";
import { validateTokken } from "../utils/tokken.mjs";

const router = Router();

// POST /iavipcom
router.post("/iavipcom", async (req, res) => {
  try {
    const rawToken = req.headers["x-esteborg-token"] || "";
    const tokenData = validateTokken(rawToken);

    if (!tokenData) {
      return res.status(401).json({
        error: "invalid_token",
        message: "Tokken inválido o expirado.",
      });
    }

    const userMessage = req.body?.message || "";
    const lang = req.body?.lang || "ES";

    const reply = await iaVipComReply({
      userMessage,
      lang,
      tokenData,
    });

    return res.json(reply);
  } catch (err) {
    console.error("❌ Error en /iavipcom:", err);
    return res.status(500).json({
      error: "internal_error",
      message: "Error interno al procesar IA VIP",
    });
  }
});

export function registerIaVipComRoutes(app) {
  app.use("/", router);
}

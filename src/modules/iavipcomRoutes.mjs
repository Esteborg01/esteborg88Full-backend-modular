// src/modules/iavipcomRoutes.mjs
import express from "express";
import { iavipcomService } from "../services/iavipcomService.mjs";
import { verifyTokken } from "../utils/tokken.mjs";

const router = express.Router();

// POST /api/modules/iavipcom
router.post("/", async (req, res) => {
  try {
    const { message, userName, lang = "es", tokken } = req.body;

    // 1. Validación de token
    const tokenInfo = verifyTokken(tokken);
    if (!tokenInfo.valid) {
      return res.status(200).json({
        module: "iavipcom",
        reply:
          "❌ Tu Tokken Esteborg Members no es válido. Verifica tu membresía en https://membersvip.esteborg.live/#miembrosvip",
        tokenStatus: "invalid",
      });
    }

    // 2. Ejecutar servicio
    const reply = await iavipcomService({
      message,
      userName,
      lang,
      history: req.body.history || [],
    });

    return res.status(200).json({
      module: "iavipcom",
      reply,
      tokenStatus: "valid",
      tokenInfo,
    });
  } catch (err) {
    console.error("[IAvipCom ERROR]", err);
    return res.status(500).json({
      module: "iavipcom",
      reply: "⚠️ Estamos experimentando un problema. Intenta en unos momentos.",
    });
  }
});

export { router as iavipcomRoutes };

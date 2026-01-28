// src/modules/iavipcomRoutes.mjs

import { Router } from "express";
import { processIaVipComMessage } from "../services/iavipcomService.mjs";
import { validateTokken } from "../utils/tokkenValidator.mjs";

const router = Router();

// POST /api/modules/iavipcom
router.post("/", async (req, res) => {
  try {
    const { message, token } = req.body;

    if (!message || !token) {
      return res.status(400).json({
        error: "missing_fields",
        message: "message y token son requeridos",
      });
    }

    const tokenData = validateTokken(token);

    if (!tokenData?.email) {
      return res.status(401).json({
        error: "invalid_token",
        message: "Tokken inválido",
      });
    }

    const userEmail = tokenData.email;

    const aiResponse = await processIaVipComMessage({
      message,
      userEmail,
    });

    return res.json({
      ok: true,
      response: aiResponse,
    });
  } catch (err) {
    console.error("❌ Error en IA VIP:", err);
    return res.status(500).json({
      error: "internal_error",
      message: "Hubo un error procesando la IA VIP",
    });
  }
});

export function registerIaVipComRoutes(app) {
  app.use("/api/modules/iavipcom", router);
}

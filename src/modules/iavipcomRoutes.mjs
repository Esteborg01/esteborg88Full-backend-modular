// src/modules/iavipcomRoutes.mjs
// =======================================================
//            Rutas VIP para IA Premium Com
// =======================================================

import { Router } from "express";
import { getIaVipComReply } from "../services/iavipcomService.mjs";
import { validateTokken } from "../utils/tokken.mjs";

const router = Router();

// =========================================
// POST /api/iavipcom
// =========================================

router.post("/iavipcom", async (req, res) => {
  try {
    const { module, message, tokken } = req.body || {};

    const valid = validateTokken(tokken);
    if (!valid.ok) {
      return res.status(401).json({ error: "invalid_token" });
    }

    const reply = await getIaVipComReply({
      module,
      userMessage: message
    });

    return res.json({ reply });

  } catch (err) {
    console.error("❌ Error en /iavipcom:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Registrar ruta
export function registerIaVipComRoutes(app) {
  app.use("/api", router);
}

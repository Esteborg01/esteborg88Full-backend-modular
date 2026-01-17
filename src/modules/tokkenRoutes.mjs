// src/modules/tokkenRoutes.mjs

import { Router } from "express";
import { generateTokkenForUser } from "../utils/tokken.mjs";

const router = Router();

// Ruta real que usa el front Members: POST /generate-token
router.post("/generate-token", async (req, res) => {
  try {
    const { email, personUid, accountUid } = req.body || {};

    if (!email || !personUid || !accountUid) {
      return res.status(400).json({
        error: "missing_fields",
        message: "email, personUid y accountUid son requeridos",
      });
    }

    const token = generateTokkenForUser({ email, personUid, accountUid });

    return res.json({ token });
  } catch (err) {
    console.error("❌ Error en /generate-token:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export function registerTokkenRoutes(app) {
  // Montado en raíz, igual que el backend viejo:
  app.use("/", router);
}

// src/modules/tokkenRoutes.mjs

import { Router } from "express";
import { generateTokkenForUser, validateTokken } from "../utils/tokken.mjs";

const router = Router();

// =============================
// GENERAR TOKEN (YA EXISTENTE)
// =============================
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


// =============================
// VALIDAR TOKEN (NUEVO PARA GPT)
// =============================
router.post("/validate-token", async (req, res) => {
  try {
    const { token } = req.body || {};

    if (!token) {
      return res.json({
        valid: false,
        error: "missing_token"
      });
    }

    const result = validateTokken(token);

    // Token inválido
    if (result.status !== "valid") {
      return res.json({
        valid: false,
        expired: result.reason === "expired",
        reason: result.reason
      });
    }

    const email = result.raw?.email || null;

    // 🔥 AQUÍ PUEDES HACER LÓGICA REAL (fase 2)
    // Por ahora: todo token válido tiene acceso a comunica

    const modulesAllowed = ["comunica"];

    return res.json({
      valid: true,
      expired: false,
      email,
      modulesAllowed,
      plan: "comunica_basic"
    });

  } catch (err) {
    console.error("❌ validate-token error:", err);

    return res.json({
      valid: false,
      error: "server_error"
    });
  }
});


// =============================
// OPCIONAL PRO: DEBUG TOKEN
// =============================
router.post("/debug-token", async (req, res) => {
  try {
    const { token } = req.body || {};

    const result = validateTokken(token);

    return res.json({
      ok: true,
      result
    });

  } catch (err) {
    return res.json({
      ok: false,
      error: "debug_error"
    });
  }
});


// =============================
// REGISTER
// =============================
export function registerTokkenRoutes(app) {
  app.use("/", router);
}

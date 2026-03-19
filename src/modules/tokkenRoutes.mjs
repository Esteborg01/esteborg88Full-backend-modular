// src/modules/tokkenRoutes.mjs

import { Router } from "express";
import { generateTokkenForUser, validateTokken } from "../utils/tokken.mjs";

const router = Router();

// =============================
// GENERAR TOKEN
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
// VALIDAR TOKEN (GPT)
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

    // ❌ Token inválido
    if (result.status !== "valid") {
      return res.json({
        valid: false,
        expired: result.reason === "expired",
        reason: result.reason
      });
    }

    const email = result.raw?.email;

    if (!email) {
      return res.json({
        valid: false,
        error: "no_email_in_token"
      });
    }

    // 🔥 DB REAL
    const db = req.app.locals.db;
    const users = db.collection("users");

    const user = await users.findOne({ email });

    if (!user) {
      return res.json({
        valid: false,
        error: "user_not_found"
      });
    }

    // 🔥 EXPIRACIÓN
    const expired = user.expiresAt && new Date() > new Date(user.expiresAt);

    if (expired) {
      return res.json({
        valid: false,
        expired: true,
        plan: user.plan || null
      });
    }

    // 🔥 MULTI-MÓDULO POR PLAN
    let modulesAllowed = [];

    switch (user.plan) {
      case "comunica_basic":
        modulesAllowed = ["comunica"];
        break;

      case "pro_comercial":
        modulesAllowed = ["comunica", "ventas"];
        break;

      case "esteborg_full":
        modulesAllowed = ["comunica", "ventas", "iavip", "erpev"];
        break;

      default:
        modulesAllowed = user.modulesAllowed || [];
    }

    // 🔥 DÍAS RESTANTES
    let daysLeft = null;
    if (user.expiresAt) {
      const diff = new Date(user.expiresAt) - new Date();
      daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return res.json({
      valid: true,
      expired: false,
      email: user.email,
      plan: user.plan || null,
      modulesAllowed,
      expiresAt: user.expiresAt || null,
      daysLeft
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
// DEBUG OPCIONAL
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

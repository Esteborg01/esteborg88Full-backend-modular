// src/modules/iavipcomRoutes.mjs

import express from "express";
import { validateTokken } from "../utils/tokken.mjs";
import { handleIaVipCom } from "../services/iavipcomService.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const rawToken = req.body?.tokken || req.headers["x-tokken"];

  const validation = validateTokken(rawToken);

  if (!validation.valid) {
    return res.status(401).json({
      ok: false,
      message: "Tokken Esteborg Members requerido"
    });
  }

  try {
    const result = await handleIaVipCom(req.body, validation.data);
    res.json(result);
  } catch (err) {
    console.error("IAvipCom error:", err);
    res.status(500).json({ ok: false, error: "IAvipCom failed" });
  }
});

export function registerIaVipComRoutes(app) {
  app.use("/api/modules/iavipcom", router);
}

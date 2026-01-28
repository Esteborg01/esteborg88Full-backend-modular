import { Router } from "express";
import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

const router = Router();

// Middleware de validación de Tokken Esteborg Members
router.use((req, res, next) => {
  const rawToken = req.headers["x-tokken"] || "";

  const result = validateTokken(rawToken);
  if (!result.isValid) {
    return res.status(401).json({
      error: "invalid_token",
      message: "Tokken inválido o ausente",
    });
  }

  req.user = result;
  next();
});

// POST principal del módulo
router.post("/", async (req, res) => {
  try {
    const { message } = req.body || {};
    const reply = await getIaVipComReply({ message, user: req.user });
    return res.json({ reply });
  } catch (err) {
    console.error("❌ Error en IA VipCom:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// ESTA ES LA PUTA FUNCIÓN QUE TE FALTABA
export function registerIaVipComRoutes(app) {
  app.use("/api/modules/iavipcom", router);
}

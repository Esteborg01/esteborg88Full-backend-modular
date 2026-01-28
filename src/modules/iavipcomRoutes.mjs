// src/modules/iavipcomRoutes.mjs

import { Router } from "express";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

export function registerIaVipComRoutes(app, openai) {
  const router = Router();

  // Ruta principal del módulo IA VIP
  router.post("/api/modules/iavipcom", async (req, res) => {
    try {
      const {
        message,
        history = [],
        lang = "es",
        userName,
        token,
        tokenStatus,
        tokenInfo,
      } = req.body || {};

      if (!message) {
        return res.status(400).json({
          error: "missing_message",
          message: "El mensaje del usuario es requerido.",
        });
      }

      // 👇 Igual que en comunica/erpev/ventas:
      const result = await getIaVipComReply(openai, {
        message,
        history,
        lang,
        userName,
        token,
        tokenStatus,
        tokenInfo,
      });

      // result debe traer al menos: { reply: "...", ...meta }
      return res.json({
        module: "iavipcom",
        ...result,
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/iavipcom:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error al procesar tu entrenamiento con Esteborg IA – Despliega tu poder.",
      });
    }
  });

  // Montamos en raíz como los demás módulos
  app.use("/", router);
}

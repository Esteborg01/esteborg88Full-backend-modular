// src/modules/iavipcomRoutes.mjs

import { Router } from "express";
import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

export function registerIaVipComRoutes(app, openai) {
  const router = Router();

  // Ruta que usa el frontend:
  // POST /modules/iavipcom
  router.post("/iavipcom", async (req, res) => {
    try {
      const {
        message,
        rawToken,
        token: bodyToken,
        history,
        userName,
        lang,
      } = req.body || {};

      // Aceptamos token en cualquiera de los dos campos
      const token = rawToken || bodyToken || "";

      const tokenResult = validateTokken(token);

      if (!tokenResult.ok) {
        return res.status(401).json({
          module: "iavipcom",
          error: "invalid_token",
          tokenStatus: "invalid",
          message: "Tokken Esteborg Members inválido o no proporcionado.",
        });
      }

      const reply = await getIaVipComReply(openai, {
        message,
        history,
        userName,
        lang,
      });

      const tokenInfo =
        tokenResult.tokenInfo || tokenResult.data || { email: "desconocido" };

      return res.json({
        module: "iavipcom",
        reply,
        tokenStatus: "valid",
        tokenInfo,
      });
    } catch (err) {
      console.error("❌ Error en /modules/iavipcom:", err);
      return res.status(500).json({
        module: "iavipcom",
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en el módulo Esteborg IA - Despliega todo tu poder.",
      });
    }
  });

  // Igual que en tokkenRoutes: montamos el router bajo /modules
  app.use("/modules", router);
}

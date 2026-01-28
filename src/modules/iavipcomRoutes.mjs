// src/modules/iavipcomRoutes.mjs

import { Router } from "express";
import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

const router = Router();

/**
 * Si más adelante quieres volver a usar eventos [ESTEBORG_EVENT ...],
 * aquí podríamos parsearlos. Por ahora solo devolvemos el texto tal cual.
 */
function extractEsteborgEvents(text) {
  return { cleanText: text, events: [] };
}

export function registerIaVipComRoutes(app, openai) {
  router.post("/api/modules/iavipcom", async (req, res) => {
    try {
      const {
        message,
        rawToken,
        token: bodyToken,
        history,
        userName,
        lang,
      } = req.body || {};

      // 1) Validar mensaje
      if (!message || typeof message !== "string") {
        return res.status(400).json({
          error: "missing_message",
          message: "El campo 'message' es requerido.",
        });
      }

      // 2) Tomar token de donde venga (rawToken o token)
      const tokenStr = rawToken || bodyToken || "";

      if (!tokenStr) {
        return res.status(400).json({
          error: "missing_token",
          message: "No se recibió Tokken Esteborg Members.",
        });
      }

      // 3) Validar tokken con tu util REAL
      const tokenResult = validateTokken(tokenStr);
      const tokenInfo = tokenResult?.tokenInfo || null;

      // (si quieres ponerte más exigente puedes rebotar aquí si es inválido)
      // if (!tokenResult?.valid) { ... }

      const email = tokenInfo?.email || null;

      // 4) Llamar al servicio que habla con OpenAI
      const replyRaw = await getIaVipComReply(openai, {
        message,
        history,
        userName,
        lang,
        email,
      });

      const { cleanText: reply, events } = extractEsteborgEvents(replyRaw);

      return res.json({
        reply,
        tokenStatus: tokenResult?.status || "valid",
        tokenInfo,
        progressEvents: events,
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/iavipcom:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en el módulo Esteborg IA - Despliega todo tu poder.",
      });
    }
  });

  // Montamos el router en raíz (como tus otros módulos)
  app.use("/", router);
}

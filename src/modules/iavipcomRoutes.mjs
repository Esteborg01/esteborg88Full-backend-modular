// src/modules/iavipcomRoutes.mjs

import { Router } from "express";
import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

const router = Router();

/**
 * Registro de rutas para Esteborg IA – Despliega todo tu poder
 * Path esperado por el frontend:
 *   POST /api/modules/iavipcom
 */
export function registerIaVipComRoutes(app, openai) {
  router.post("/", async (req, res) => {
    try {
      // 1) Leer Tokken desde header o body (compatibilidad con todos tus frontends)
      const rawToken =
        req.headers["x-esteborg-tokken"] ||
        req.body?.tokken ||
        req.body?.token ||
        null;

      const {
        isValid,
        statusCode,
        clientMessage,
        info: tokenInfo,
      } = validateTokken(rawToken);

      // 2) Si el Tokken NO es válido → respondemos 4xx pero con mensaje claro
      if (!isValid) {
        return res.status(statusCode).json({
          module: "iavipcom",
          reply: clientMessage,
          tokenStatus: "invalid",
          tokenInfo,
        });
      }

      // 3) Extraer payload de IA
      const {
        message,
        history = [],
        userName = "",
        lang = "es",
      } = req.body || {};

      if (!message) {
        return res.status(400).json({
          module: "iavipcom",
          error: "missing_message",
          message:
            "Falta el mensaje del usuario en el cuerpo de la petición (campo 'message').",
        });
      }

      // 4) Llamar al brain específico del programa IA
      const reply = await getIaVipComReply(openai, {
        message,
        history,
        userName,
        lang,
      });

      // 5) Respuesta estándar para el frontend Esteborg
      return res.json({
        module: "iavipcom",
        reply,
        tokenStatus: "valid",
        tokenInfo,
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/iavipcom:", err);

      return res.status(500).json({
        module: "iavipcom",
        error: "internal_error",
        message:
          "Tuvimos un problema al conectar con Esteborg IA. Verifica tu conexión o inténtalo en unos momentos.",
      });
    }
  });

  // Montamos el router EXACTAMENTE donde el frontend lo espera:
  // POST https://.../api/modules/iavipcom
  app.use("/api/modules/iavipcom", router);
}

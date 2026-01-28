// src/modules/iavipcomRoutes.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

/**
 * Registro de rutas para Esteborg IA – Despliega todo tu poder.
 * Importante: la ruta debe ser /modules/iavipcom
 * porque eso es lo que llama el frontend desde el iframe.
 */
export function registerIaVipComRoutes(app, openai) {
  // 👇 OJO: SIN /api, igual que comunica, ventas, erpev, etc.
  app.post("/modules/iavipcom", async (req, res) => {
    try {
      const {
        message,
        rawToken,
        token: bodyToken,
        history,
        userName,
        lang,
      } = req.body || {};

      // 1) Validar que venga mensaje
      if (!message || typeof message !== "string") {
        return res.status(400).json({
          error: "missing_message",
          message:
            "Falta el mensaje principal para trabajar en tu entrenamiento de IA.",
        });
      }

      // 2) Resolver el token que venga (si viene)
      const incomingToken =
        typeof rawToken === "string" && rawToken.trim()
          ? rawToken.trim()
          : typeof bodyToken === "string" && bodyToken.trim()
          ? bodyToken.trim()
          : null;

      let tokenStatus = "missing";
      let tokenInfo = null;

      if (incomingToken) {
        try {
          const validation = validateTokken(incomingToken);
          tokenStatus = validation.status || "valid";
          tokenInfo = validation.tokenInfo || null;
        } catch (err) {
          console.error("❌ Error al validar Tokken en iavipcom:", err);
          tokenStatus = "invalid";
        }
      }

      // 3) Llamar al "cerebro" de Esteborg IA – Despliega todo tu poder
      const reply = await getIaVipComReply({
        openai,
        message,
        history: Array.isArray(history) ? history : [],
        userName: userName || "",
        lang: lang || "es",
        tokenStatus,
        tokenInfo,
      });

      // 4) Respuesta unificada al frontend
      return res.json({
        module: "iavipcom",
        reply,
        tokenStatus,
        tokenInfo,
      });
    } catch (err) {
      console.error("❌ Error en /modules/iavipcom:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en el módulo Esteborg IA - Despliega todo tu poder.",
      });
    }
  });
}

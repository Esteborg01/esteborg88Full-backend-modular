// src/modules/iavipcomRoutes.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

export function registerIaVipComRoutes(app, openai) {
  app.post("/api/modules/iavipcom", async (req, res) => {
    try {
      const {
        message,
        rawToken,
        token: bodyToken,
        history = [],
        userName,
        lang = "es",
      } = req.body || {};

      // 1) Elegimos el token a usar
      const tokenToUse = rawToken || bodyToken || "";

      // 2) Validamos el token usando la utilidad compartida
      const tokenResult = validateTokken(tokenToUse);

      if (!tokenToUse || !tokenResult || tokenResult.valid === false) {
        // Respuesta cuando el token no es válido o falta
        return res.status(401).json({
          module: "iavipcom",
          reply:
            "Necesito tu Tokken Esteborg Members para continuar con Esteborg IA – Despliega todo tu poder.",
          tokenStatus: "invalid",
          tokenInfo: tokenResult || null,
        });
      }

      // 3) Obtenemos la respuesta del Cerebro IA VIP
      const reply = await getIaVipComReply(openai, {
        message,
        history,
        userName,
        lang,
      });

      // 4) Respondemos al front
      return res.json({
        module: "iavipcom",
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult.tokenInfo || tokenResult,
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
}

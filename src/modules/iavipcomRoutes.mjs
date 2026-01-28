// src/modules/iavipcomRoutes.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

export function registerIaVipComRoutes(app, openai) {
  // IMPORTANTE: el frontend llama a /modules/iavipcom (sin /api)
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

      const usedToken = rawToken || bodyToken || "";

      const tokenResult = validateTokken(usedToken);

      if (!tokenResult.ok) {
        // Mismo patrón que los otros módulos cuando el Tokken falla
        return res.status(200).json({
          module: "iavipcom",
          reply:
            "Tuvimos un problema al validar tu Tokken Esteborg Members. Verifica tu acceso o intenta de nuevo en unos momentos.",
          tokenStatus: "invalid",
          tokenInfo: tokenResult.tokenInfo,
        });
      }

      const reply = await getIaVipComReply(openai, {
        message,
        history,
        userName,
        lang,
      });

      return res.status(200).json({
        module: "iavipcom",
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult.tokenInfo,
      });
    } catch (err) {
      console.error("❌ Error en /modules/iavipcom:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en el módulo Esteborg IA – Despliega todo tu poder.",
      });
    }
  });
}

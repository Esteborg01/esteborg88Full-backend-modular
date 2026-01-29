// src/modules/iavipcomRoutes.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

export function registerIaVipComRoutes(app, openai) {
  app.post("/api/modules/iavipcom", async (req, res) => {
    try {
      const { message, rawToken, userName, history, lang } = req.body || {};

      const tokenResult = await validateTokken(rawToken);

      // OJO: en tu repo hay 2 variantes del validador.
      // - Variante A: { status: "valid" | "invalid", raw: {...} }
      // - Variante B: { valid: true|false, tokenInfo: {...} }
      // Este bloque soporta ambas sin que te metas a “cirugía” ahorita.
      const isValid =
        tokenResult?.status
          ? tokenResult.status === "valid"
          : tokenResult?.valid === true;

      if (!isValid) {
        const fallbackReply =
          "¡Qué gusto saludarte! 😊 Antes de entrar a tu entrenamiento necesito tu Tokken Esteborg Members para validar tu acceso.\n\n" +
          "Pégalo aquí abajo ⬇️\n\n" +
          "Si aún no tienes token, puedes obtenerlo o recuperarlo en:\n" +
          "https://membersvip.esteborg.live/#miembrosvip";

        return res.json({
          module: "iavipcom",
          reply: fallbackReply,
          tokenStatus: "invalid",
          tokenInfo: tokenResult?.raw || tokenResult?.tokenInfo || tokenResult || {},
        });
      }

      const reply = await getIaVipComReply(openai, {
        message,
        history,
        userName,
        lang,
      });

      return res.json({
        module: "iavipcom",
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult?.raw || tokenResult?.tokenInfo || tokenResult || {},
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/iavipcom:", err);
      return res.status(500).json({
        error: "internal_error",
        message: "Ocurrió un error inesperado en el módulo Esteborg IA VIP.",
      });
    }
  });
}

// src/modules/iavipcomRoutes.mjs
import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

export function registerIaVipComRoutes(app, openai) {
  app.post("/api/modules/iavipcom", async (req, res) => {
    try {
      const { message, rawToken, userName, history, lang } = req.body || {};

      const tokenResult = validateTokken(rawToken);

      // ❌ IAvip NO tiene demo: si no es válido, se bloquea (pero con mensaje bonito)
      if (tokenResult.status !== "valid") {
        const fallbackReply =
          "Antes de entrar a tu entrenamiento VIP necesito tu Tokken Esteborg Members para validar tu acceso.\n\n" +
          "Pégalo aquí abajo ⬇️\n\n" +
          "Si aún no tienes token, puedes obtenerlo o recuperarlo en:\n" +
          "https://membersvip.esteborg.live/#miembrosvip";

        return res.status(401).json({
          module: "iavipcom",
          reply: fallbackReply,
          tokenStatus: "invalid",
          tokenInfo: tokenResult,
        });
      }

      const reply = await getIaVipComReply(openai, {
        message,
        history,
        userName,
        lang: lang || "es",
      });

      return res.json({
        module: "iavipcom",
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult.raw,
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/iavipcom:", err);
      return res.status(500).json({
        error: "internal_error",
        message: "Ocurrió un error inesperado en Esteborg IA VIP (iavipcom).",
      });
    }
  });
}

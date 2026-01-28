// src/modules/iavipcomRoutes.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

export function registerIaVipComRoutes(app, openai) {
  app.post("/api/modules/iavipcom", async (req, res) => {
    try {
      const body = req.body || {};

      // ✅ Compatibilidad con frontend (varios nombres posibles)
      const message =
        body.message ??
        body.userMessage ??
        body.text ??
        "";

      const rawToken =
        body.rawToken ??
        body.tokken ??
        body.token ??
        "";

      const userName =
        body.userName ??
        body.name ??
        "";

      const history =
        Array.isArray(body.history) ? body.history : [];

      const lang =
        body.lang ??
        body.language ??
        "es";

      const tokenResult = validateTokken(rawToken);

      // 👇 tokken.mjs regresa { status, isValid }
      if (tokenResult.status !== "valid" || tokenResult.isValid !== true) {
        const fallbackReply =
          "¡Qué gusto saludarte! 😊 Antes de empezar necesito tu Tokken Esteborg Members para validar tu acceso.\n\n" +
          "Si aún no lo tienes, puedes obtenerlo o recuperarlo aquí:\n" +
          "https://membersvip.esteborg.live/#miembrosvip\n\n" +
          "Pégalo aquí y arrancamos. 🔐";

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
        lang,
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
        message: "Error interno en IAvipCom",
      });
    }
  });
}

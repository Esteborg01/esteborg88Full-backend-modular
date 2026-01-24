// src/modules/erpev.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getErpEvalReply } from "../services/erpevService.mjs";

export function registerErpevRoutes(app, openai) {
  app.post("/api/modules/erpev", async (req, res) => {
    try {
      const {
        message,
        rawToken,
        token: bodyToken,
        userName,
        history,
        lang,
      } = req.body || {};

      const headerToken = req.headers["x-esteborg-token"];
      const effectiveToken = rawToken || bodyToken || headerToken;

      const tokenResult = validateTokken(effectiveToken);

      // Si el Tokken NO es válido, respondemos igual que IA: pedir Tokken
      if (tokenResult.status !== "valid") {
        const fallbackReply =
          "¡Qué gusto saludarte! 😊 Antes de entrar a tu diagnóstico avanzado de Sistemas ERP necesito tu Tokken Esteborg Members para validar tu acceso.\n\n" +
          "Si aún no tienes token, puedes obtenerlo o recuperarlo en:\n" +
          "https://membersvip.esteborg.live/#miembrosvip\n\n" +
          "1️⃣ Pega aquí tu Tokken Esteborg Members.\n" +
          "2️⃣ Después dime cómo se llama tu empresa y en qué país opera.";

        return res.json({
          module: "erpev",
          reply: fallbackReply,
          tokenStatus: tokenResult.status,
          tokenInfo: tokenResult,
        });
      }

      if (!message || typeof message !== "string") {
        return res.status(400).json({
          error: "missing_message",
          message: "Falta el mensaje del usuario.",
        });
      }

      const reply = await getErpEvalReply(openai, {
        message,
        history,
        userName,
        lang,
      });

      return res.json({
        module: "erpev",
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult.tokenInfo,
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/erpev:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en el módulo de Evaluación Avanzada de Sistemas ERP.",
      });
    }
  });
}

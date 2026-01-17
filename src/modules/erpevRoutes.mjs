// src/modules/erpevRoutes.mjs
import { validateTokken } from "../utils/tokken.mjs";
import { getErpevReply } from "../services/erpevService.mjs";

export function registerErpevRoutes(app, openai) {
  app.post("/api/modules/erpev", async (req, res) => {
    try {
      const { message, rawToken, userName, history } = req.body || {};

      const tokenResult = validateTokken(rawToken);

      if (tokenResult.status !== "valid") {
        const fallbackReply =
          "Bienvenido a Esteborg ERPev — Evaluación Avanzada de Sistemas ERP 🧠🏢\n\n" +
          "Para activar el análisis premium de tu situación ERP, necesito validar tu **Token Esteborg Members**.\n" +
          "Pega tu token aquí abajo para desbloquear la evaluación avanzada, comparaciones y recomendaciones personalizadas.\n\n" +
          "Si aún no tienes token, puedes obtenerlo o recuperarlo en:\n" +
          "https://membersvip.esteborg.live/#miembrosvip";

        return res.json({
          module: "erpev",
          reply: fallbackReply,
          tokenStatus: "invalid",
          tokenInfo: tokenResult,
        });
      }

      const reply = await getErpevReply(openai, {
        message,
        history,
        userName,
      });

      return res.json({
        module: "erpev",
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult.raw,
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/erpev:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en EsteborgERPev (Evaluación avanzada de sistemas ERP).",
      });
    }
  });
}

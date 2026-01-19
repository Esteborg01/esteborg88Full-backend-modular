// src/modules/demoWelcomeRoutes.mjs
import { getDemoWelcomeReply } from "../services/demoWelcomeService.mjs";

export function registerDemoRoutes(app, openai) {
  app.post("/api/demo/welcome", async (req, res) => {
    try {
      const { message, userName, history, lang } = req.body || {};

      // Normalizar idioma que viene del front
      const langCode = (lang || "es").toLowerCase();
      const safeLang = ["es", "en", "fr", "pt", "de", "it"].includes(langCode)
        ? langCode
        : "es";

      // Contar cuántas respuestas del assistant ya hubo
      let interactionCount = 0;
      if (Array.isArray(history)) {
        interactionCount = history.filter(
          (msg) => msg && msg.role === "assistant"
        ).length;
      }

      const MAX_INTERACTIONS = 14;

      function isEnglish(text) {
        if (!text) return false;
        const t = text.toLowerCase();
        return (
          t.includes(" the ") ||
          t.includes(" and ") ||
          t.includes("improve") ||
          t.includes("leadership") ||
          t.includes("communication") ||
          t.includes("clarity")
        );
      }

      // Si ya se acabó la demo, mandar mensaje final
      if (interactionCount >= MAX_INTERACTIONS) {
        let hardStopMessage;

        // Para el hard stop usamos idioma:
        // - si front dijo EN, mandamos inglés
        // - si no, usamos la heurística vieja como fallback
        const shouldUseEnglish =
          safeLang === "en" || (safeLang !== "es" && isEnglish(message));

        if (shouldUseEnglish) {
          hardStopMessage =
            "🧭 Thank you for joining this conversation. It was a pleasure helping you reflect on your communication. " +
            "If you'd like to continue your process or access the full 7-day training with a 50% discount, visit https://membersvip.esteborg.live/. " +
            "Wishing you clarity and success in your professional growth.";
        } else {
          hardStopMessage =
            "🧭 Gracias por participar en esta conversación. Ha sido un placer ayudarte a reflexionar sobre tu comunicación. " +
            "Si deseas continuar tu proceso o acceder al entrenamiento con el 50% de descuento, visita https://membersvip.esteborg.live/. " +
            "Te deseo éxito en tu desarrollo profesional.";
        }

        return res.json({
          demo: true,
          reply: hardStopMessage,
          demoStatus: "ended",
          interactionCount,
          remainingInteractions: 0,
        });
      }

      const remainingInteractions = Math.max(
        0,
        MAX_INTERACTIONS - (interactionCount + 1)
      );

      const reply = await getDemoWelcomeReply(openai, {
        message,
        history,
        userName,
        interactionCount,
        remainingInteractions,
        lang: safeLang,
      });

      return res.json({
        demo: true,
        reply,
        demoStatus: "active",
        interactionCount: interactionCount + 1,
        remainingInteractions,
      });
    } catch (err) {
      console.error("❌ Error en /api/demo/welcome:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en el demo 'Esteborg te da la bienvenida'.",
      });
    }
  });
}

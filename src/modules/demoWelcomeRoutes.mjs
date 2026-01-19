// src/modules/demoWelcomeRoutes.mjs
import { getDemoWelcomeReply } from "../services/demoWelcomeService.mjs";

export function registerDemoRoutes(app, openai) {
  app.post("/api/demo/welcome", async (req, res) => {
    try {
      const {
        message,
        userName,
        history,
        lang,
        demoStep,
        maxDemoInteractions,
      } = req.body || {};

      // Historial seguro
      const safeHistory = Array.isArray(history) ? history : [];

      // Cuántas respuestas del assistant hay ya en el historial
      let interactionCount = safeHistory.filter(
        (msg) => msg && msg.role === "assistant"
      ).length;

      // Límite duro de interacciones de la demo
      const MAX_STEPS =
        typeof maxDemoInteractions === "number" && maxDemoInteractions > 0
          ? maxDemoInteractions
          : 14;

      const remainingInteractions = Math.max(0, MAX_STEPS - interactionCount);

      // Pedimos la respuesta a OpenAI con contexto de pasos
      const reply = await getDemoWelcomeReply(openai, {
        message,
        history: safeHistory,
        userName,
        lang,
        interactionCount,        // respuestas previas del assistant
        remainingInteractions,   // cuántas quedarían ANTES de esta
        demoStep,                // por si el front lo manda explícito
        maxDemoInteractions: MAX_STEPS,
      });

      // Ya se generó respuesta -> contamos esta como una interacción más
      const newInteractionCount = interactionCount + 1;
      const remainingAfter = Math.max(0, MAX_STEPS - newInteractionCount);

      const demoStatus = remainingAfter <= 0 ? "ended" : "active";

      return res.json({
        reply,
        demoStatus,
        interactionCount: newInteractionCount,
        remainingInteractions: remainingAfter,
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

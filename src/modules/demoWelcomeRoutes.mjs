// src/modules/demoWelcomeRoutes.mjs
import { getDemoWelcomeReply } from "../services/demoWelcomeService.mjs";
import { trackDemoInteraction } from "../services/metricsService.mjs";

const MAX_STEPS = 14; // Límite estándar de interacciones de la demo

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

      // Contar cuántas respuestas del assistant ya hubo
      let interactionCount = safeHistory.filter(
        (msg) => msg && msg.role === "assistant"
      ).length;

      // Límite efectivo de la demo (si el front manda otro valor, lo respetamos)
      const maxSteps =
        typeof maxDemoInteractions === "number" && maxDemoInteractions > 0
          ? maxDemoInteractions
          : MAX_STEPS;

      const remainingInteractions = Math.max(0, maxSteps - interactionCount);

      // Llamamos al servicio que habla con OpenAI
      const reply = await getDemoWelcomeReply(openai, {
        message,
        history: safeHistory,
        userName,
        lang,
        interactionCount,
        remainingInteractions,
        demoStep,
        maxDemoInteractions: maxSteps,
      });

      // Ya se generó respuesta -> contamos esta como una interacción más
      const newInteractionCount = interactionCount + 1;
      const remainingAfter = Math.max(0, maxSteps - newInteractionCount);

      const demoStatus = remainingAfter <= 0 ? "ended" : "active";

      // 🔹 Métricas del demo
      trackDemoInteraction({
        req,
        step: newInteractionCount,
        status: demoStatus,
        lang: lang || "es",
        remaining: remainingAfter,
        userName,
      });

      // Respondemos al frontend
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

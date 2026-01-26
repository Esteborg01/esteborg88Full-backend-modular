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

      // Paso que manda el frontend (1..14). Si no viene, asumimos 1.
      const stepFromClient =
        typeof demoStep === "number" && demoStep > 0 ? demoStep : 1;

      // Límite efectivo de la demo
      const maxSteps =
        typeof maxDemoInteractions === "number" && maxDemoInteractions > 0
          ? maxDemoInteractions
          : MAX_STEPS;

      // Llamamos al cerebro TURBO multiidioma
      const result = await getDemoWelcomeReply(openai, {
        message,
        userName,
        history: safeHistory,
        lang,
        demoStep: stepFromClient,
        maxDemoInteractions: maxSteps,
      });

      const {
        reply,
        demoStatus = "active",
        interactionCount = stepFromClient,
        remainingInteractions = Math.max(maxSteps - stepFromClient, 0),
        effectiveLang,
      } = result || {};

      // 🔹 Métricas del demo (no debe romper nada si falla)
      try {
        trackDemoInteraction({
          req,
          step: interactionCount,
          status: demoStatus,
          lang: effectiveLang || lang || "es",
          remaining: remainingInteractions,
          userName,
        });
      } catch (metricErr) {
        console.warn("⚠ Error al registrar métricas de demo:", metricErr);
      }

      // Respuesta al frontend (lo que consume tu index perfecto)
      return res.json({
        reply,
        demoStatus,
        interactionCount,
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

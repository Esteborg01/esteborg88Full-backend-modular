import express from "express";
import { getDemoWelcomeReply } from "../services/demoWelcomeService.mjs";
import { trackDemoInteraction } from "../services/metricsService.mjs";

const router = express.Router();

const MAX_STEPS = 14; // Límite de interacciones del demo

router.post("/welcome", async (req, res) => {
  try {
    const { message, lang, interactionCount = 0, userName = "" } = req.body;

    // Validación mínima
    if (!message || !lang) {
      return res.status(400).json({
        error: "invalid_request",
        message: "Missing message or lang in request.",
      });
    }

    // Llamamos al servicio que genera la respuesta del demo
    const reply = await getDemoWelcomeReply({
      userMessage: message,
      lang,
      interactionCount,
      userName
    });

    // --- Contador de interacciones ---
    const newInteractionCount = interactionCount + 1;
    const remainingAfter = Math.max(0, MAX_STEPS - newInteractionCount);

    // Estado de la demo según cuántas interacciones quedan
    const demoStatus = remainingAfter <= 0 ? "ended" : "active";

    // --- Registrar métrica ---
    trackDemoInteraction({
      req,
      step: newInteractionCount,
      status: demoStatus,
      lang: lang || "es",
      remaining: remainingAfter,
      userName: userName || "",
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

export default router;

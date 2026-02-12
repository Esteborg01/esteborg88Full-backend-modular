// src/modules/voiceRoutes.mjs
import { synthesizeWithElevenLabs } from "../services/elevenlabsService.mjs";

const ALLOWED_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "IdhxxSTaAg80CTeSgScm";

function clamp01(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

export function registerVoiceRoutes(app) {
  app.post("/api/voice", async (req, res) => {
    try {
      const body = req.body || {};
      const text = typeof body.text === "string" ? body.text : "";

      if (!text.trim()) {
        return res.status(400).json({
          error: "missing_text",
          message: "Falta el campo 'text' para sintetizar voz.",
        });
      }

      // Opcional: límite duro de texto (seguridad/costo)
      const safeText = text.length > 800 ? text.slice(0, 800) : text;

      // Acepta voiceId pero SOLO permite tu voz (para que los GPTs no cambien voz)
      const requestedVoiceId =
        typeof body.voiceId === "string" && body.voiceId.trim()
          ? body.voiceId.trim()
          : ALLOWED_VOICE_ID;

      if (requestedVoiceId !== "IdhxxSTaAg80CTeSgScm") {
        return res.status(403).json({
          error: "voice_not_allowed",
          message: "VoiceId no permitido.",
        });
      }

      // Defaults seguros (suaves, naturales, sin exagerar)
      const stability = clamp01(body.stability, 0.5);
      const style = clamp01(body.style, 0.35);

      const audioBuffer = await synthesizeWithElevenLabs({
        text: safeText,
        voiceId: "IdhxxSTaAg80CTeSgScm",
        voiceSettings: {
          stability,
          style,
        },
      });

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "no-store");
      return res.send(audioBuffer);
    } catch (err) {
      console.error("❌ Error en /api/voice:", err);
      return res.status(500).json({
        error: "tts_failed",
        message: "No se pudo generar la voz con ElevenLabs.",
      });
    }
  });
}

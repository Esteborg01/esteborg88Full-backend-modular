// src/modules/voiceRoutes.mjs
import { synthesizeWithElevenLabs } from "../services/elevenlabsService.mjs";
import { requireAuth } from "../middleware/requireAuth.mjs";
import { requireVip } from "../middleware/requireVip.mjs";

export function registerVoiceRoutes(app) {
  app.post(
    "/api/voice",
    requireAuth,
    requireVip(), // ✅ Solo exige VIP vigente (no módulo específico)
    async (req, res) => {
      try {
        const { text } = req.body || {};

        if (!text || !String(text).trim()) {
          return res.status(400).json({
            ok: false,
            error: "missing_text",
            message: "Falta el campo 'text' para sintetizar voz.",
          });
        }

        const audioBuffer = await synthesizeWithElevenLabs({ text: String(text) });

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "no-store");
        return res.send(audioBuffer);
      } catch (err) {
        console.error("❌ Error en /api/voice:", err);
        return res.status(500).json({
          ok: false,
          error: "tts_failed",
          message: "No se pudo generar la voz con ElevenLabs.",
        });
      }
    }
  );
}

import { synthesizeWithElevenLabs } from "../services/elevenlabsService.mjs";
import { requireAuth } from "../middleware/requireAuth.mjs";
import { requireVip } from "../middleware/requireVip.mjs";

const LOCKED_VOICE_ID = "IdhxxSTaAg80CTeSgScm";

const DEFAULT_STABILITY = 0.55;
const DEFAULT_STYLE = 0.35;
const DEFAULT_SIMILARITY = 0.85;
const DEFAULT_SPEAKER_BOOST = true;

function clamp01(v, fallback) {
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

export function registerVoiceRoutes(app) {
  app.post(
    "/api/voice",
    requireAuth,
    requireVip(),
    async (req, res) => {
      try {
        const { text, stability, style } = req.body || {};

        if (!text || !String(text).trim()) {
          return res.status(400).json({
            ok: false,
            error: "missing_text"
          });
        }

        const finalStability = clamp01(stability, DEFAULT_STABILITY);
        const finalStyle = clamp01(style, DEFAULT_STYLE);

        const audioBuffer = await synthesizeWithElevenLabs({
          text: String(text),
          voiceId: LOCKED_VOICE_ID,
          stability: finalStability,
          style: finalStyle,
          similarityBoost: DEFAULT_SIMILARITY,
          speakerBoost: DEFAULT_SPEAKER_BOOST
        });

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "no-store");

        return res.send(audioBuffer);

      } catch (err) {
        console.error("❌ Voice error:", err);
        return res.status(500).json({
          ok: false,
          error: "tts_failed"
        });
      }
    }
  );
}

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

function toBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["true", "1", "yes", "on"].includes(v.toLowerCase());
  if (typeof v === "number") return v === 1;
  return false;
}

export function registerVoiceRoutes(app) {
  app.post("/api/voice", requireAuth, requireVip(), async (req, res) => {
    try {
      const body = req.body || {};
      const text = (body.text ?? "").toString().trim();

      if (!text) {
        return res.status(400).json({ ok: false, error: "missing_text" });
      }

      // ✅ VOZ APAGADA POR DEFAULT
      // Solo generamos audio si el request lo pide explícitamente.
      const enabled = toBool(body.enabled ?? body.voice ?? false);

      if (!enabled) {
        return res.json({
          ok: true,
          voice: false,
          text,
          hint: "Set enabled:true to receive audio/mpeg."
        });
      }

      const finalStability = clamp01(body.stability, DEFAULT_STABILITY);
      const finalStyle = clamp01(body.style, DEFAULT_STYLE);

      const audioBuffer = await synthesizeWithElevenLabs({
        text,
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
      return res.status(500).json({ ok: false, error: "tts_failed" });
    }
  });
}

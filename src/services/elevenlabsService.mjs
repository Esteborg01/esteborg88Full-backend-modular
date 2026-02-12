// src/services/elevenlabsService.mjs

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Tu voz fija (y si no hay env, usa la tuya)
const DEFAULT_VOICE_ID = "IdhxxSTaAg80CTeSgScm";
const ELEVEN_MODEL_ID = "eleven_multilingual_v2";

function clamp01(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

/**
 * Llama a ElevenLabs para sintetizar voz a partir de texto.
 * Regresa un Buffer con audio MPEG listo para enviar al front.
 */
export async function synthesizeWithElevenLabs({ text, voiceId, voiceSettings } = {}) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("Falta ELEVENLABS_API_KEY en variables de entorno");
  }
  if (!text || !String(text).trim()) {
    throw new Error("Texto vacío para TTS");
  }

  // Forzamos SIEMPRE tu voz (aunque te manden otra)
  const safeVoiceId = voiceId === DEFAULT_VOICE_ID ? DEFAULT_VOICE_ID : DEFAULT_VOICE_ID;

  const stability = clamp01(voiceSettings?.stability, 0.5);
  const style = clamp01(voiceSettings?.style, 0.35);

  // Estos los dejamos fijos “pro” para no meter variabilidad rara
  const similarity_boost = 0.7;
  const use_speaker_boost = true;

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${safeVoiceId}`;

  const payload = {
    text,
    model_id: ELEVEN_MODEL_ID,
    voice_settings: {
      stability,
      similarity_boost,
      style,
      use_speaker_boost,
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error("❌ Error ElevenLabs:", resp.status, errText);
    throw new Error(`ElevenLabs falló con status ${resp.status}`);
  }

  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

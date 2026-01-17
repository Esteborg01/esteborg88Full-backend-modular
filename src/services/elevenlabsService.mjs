// src/services/elevenlabsService.mjs

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "IdhxxSTaAg80CTeSgScm";

// Modelo recomendado para voz natural multilenguaje
const ELEVEN_MODEL_ID = "eleven_multilingual_v2";

/**
 * Llama a ElevenLabs para sintetizar voz a partir de texto.
 * Regresa un Buffer con audio MPEG listo para enviar al front.
 */
export async function synthesizeWithElevenLabs({ text }) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("Falta ELEVENLABS_API_KEY en variables de entorno");
  }
  if (!ELEVENLABS_VOICE_ID) {
    throw new Error("Falta ELEVENLABS_VOICE_ID");
  }
  if (!text || !text.trim()) {
    throw new Error("Texto vacío para TTS");
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

  const payload = {
    text,
    model_id: ELEVEN_MODEL_ID,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.7,
      style: 0.4,
      use_speaker_boost: true,
    },
  };

  // Node 18+ ya trae fetch global
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
    throw new Error(`ElevenLabs fallo con status ${resp.status}`);
  }

  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

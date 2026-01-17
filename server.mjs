// server.mjs
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("❌ Falta OPENAI_API_KEY en variables de entorno");
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID_ES = process.env.ELEVENLABS_VOICE_ID_ES;
const ELEVENLABS_VOICE_ID_EN =
  process.env.ELEVENLABS_VOICE_ID_EN || ELEVENLABS_VOICE_ID_ES;

// ----------------------------------------
// TOKKEN
// ----------------------------------------
function decodeTokken(rawToken) {
  try {
    const json = Buffer.from(rawToken, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function validateTokken(rawToken) {
  if (!rawToken) {
    return { status: "invalid", reason: "missing_token" };
  }

  const data = decodeTokken(rawToken);
  if (!data) {
    return { status: "invalid", reason: "invalid_json" };
  }

  if (typeof data.ts !== "number") {
    return { status: "invalid", reason: "missing_ts" };
  }

  const ts = data.ts;
  const maxAge = 24 * 60 * 60 * 1000; // 24h
  if (Date.now() - ts > maxAge) {
    return { status: "invalid", reason: "expired" };
  }

  return { status: "valid", raw: data };
}

// -------------------------------------------------------------
// MODELOS / FUNCIONES DE RESPUESTA
// -------------------------------------------------------------
async function getDemoWelcomeReply({
  message,
  history = [],
  userName,
  interactionCount = 0,
  remainingInteractions = 0,
  lang = "es",
}) {
  const langLower = (lang || "es").toLowerCase();

  const systemPrompt =
    `Eres Esteborg en modo DEMO DE BIENVENIDA.\n` +
    `Solo puedes hablar de:\n` +
    `- comunicación con inteligencia emocional\n` +
    `- comunicación para vender\n\n` +
    `Estilo:\n` +
    `- ejecutivo\n` +
    `- humano\n` +
    `- directo\n` +
    `- mexicano neutral\n\n` +
    `Idioma principal: ${
      langLower === "en" ? "inglés" : "español latino"
    }.\n` +
    `Responde siempre en el mismo idioma que el usuario.\n\n` +
    `Máximo de 14 interacciones por demo.\n` +
    `interactionsUsed = ${interactionCount}, remaining = ${remainingInteractions}.\n` +
    `No inventes datos, no des soporte técnico de otros temas, y mantente enfocado en la reflexión y en la acción práctica.\n`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []),
    {
      role: "user",
      content: userName
        ? `Usuario: ${userName}\nMensaje: ${message}`
        : message,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
  });

  return (
    completion?.choices?.[0]?.message?.content ||
    "No tengo una respuesta clara en este momento; escribe una frase más específica sobre tu comunicación."
  );
}

// Esteborg88Full: coach general
async function getEsteborgReply({ message, history = [], userName, lang }) {
  const langLower = (lang || "es").toLowerCase();
  const isEnglish = langLower.startsWith("en");

  const systemPrompt =
    (isEnglish
      ? `You are Esteborg, a premium executive coach in mindset, communication, leadership and applied AI for business.\n` +
        `You speak in modern, concise, executive English, with warmth and clarity.\n`
      : `Eres Esteborg, un coach premium de mentalidad, comunicación, liderazgo y uso de IA en negocios.\n` +
        `Hablas en español latino moderno, claro, directo y humano.\n`) +
    `Te diriges por su nombre si lo conoces (userName) y siempre aterrizas en acciones concretas.\n` +
    `No haces terapia clínica ni das consejos médicos/legales.\n`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []),
    {
      role: "user",
      content: userName ? `Usuario: ${userName}\n${message}` : message,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
  });

  return (
    completion?.choices?.[0]?.message?.content ||
    "Por ahora no tengo una respuesta clara, intenta explicarme tu situación en una frase distinta."
  );
}

// COMUNICACIÓN EMOCIONAL / LIDERAZGO
async function getComunicaReply({ message, history = [], userName, lang }) {
  const langLower = (lang || "es").toLowerCase();
  const isEnglish = langLower.startsWith("en");

  const systemPrompt =
    (isEnglish
      ? `You are Esteborg, an executive coach specialized in emotional communication, leadership and difficult conversations.\n`
      : `Eres Esteborg, un coach ejecutivo especializado en comunicación emocional, liderazgo y conversaciones difíciles.\n`) +
    `Tu estilo es directo, empático, con ejemplos concretos. Das ideas accionables en máximo 8 líneas.\n` +
    `No haces terapia, no profundizas en traumas, te enfocas en el presente y en habilidades prácticas.\n`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []),
    {
      role: "user",
      content: userName ? `Usuario: ${userName}\n${message}` : message,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
  });

  return (
    completion?.choices?.[0]?.message?.content ||
    "Dame un poco más de contexto sobre tu situación de comunicación para poder ayudarte mejor."
  );
}

// VENTAS
async function getVentasReply({ message, history = [], userName, lang }) {
  const langLower = (lang || "es").toLowerCase();
  const isEnglish = langLower.startsWith("en");

  const systemPrompt =
    (isEnglish
      ? `You are Esteborg, a sales coach focused on high-trust, high-ticket B2B deals.\n`
      : `Eres Esteborg, un coach de ventas centrado en ventas B2B de alta confianza y tickets altos.\n`) +
    `Tu estilo es directo, estratégico, sin frases de vendedor barato. Ayudas a estructurar preguntas, propuestas de valor y cierres respetuosos.\n` +
    `Responde en máximo 10 líneas y, si aplica, usa bullets o pasos.\n`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []),
    {
      role: "user",
      content: userName ? `Usuario: ${userName}\n${message}` : message,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
  });

  return (
    completion?.choices?.[0]?.message?.content ||
    "Cuéntame brevemente qué vendes, a quién y qué obstáculo principal estás enfrentando."
  );
}

// CLARIDAD MENTAL
async function getClarityReply({ message, history = [], userName, lang }) {
  const langLower = (lang || "es").toLowerCase();
  const isEnglish = langLower.startsWith("en");

  const systemPrompt =
    (isEnglish
      ? `You are Esteborg, a coach in mental clarity and executive decision-making.\n`
      : `Eres Esteborg, un coach de claridad mental y toma de decisiones ejecutivas.\n`) +
    `Te enfocas en ayudar a ordenar ideas, priorizar y decidir sin abrumarse. No das consejos clínicos ni médicos.\n` +
    `Mantén tus respuestas entre 6 y 10 líneas, con pasos concretos.\n`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []),
    {
      role: "user",
      content: userName ? `Usuario: ${userName}\n${message}` : message,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
  });

  return (
    completion?.choices?.[0]?.message?.content ||
    "Dime en una frase qué decisión te está costando más trabajo ahora mismo."
  );
}

// ERP EVALUATION (ERPev)
async function getErpEvalReply({ message, history = [], userName, lang }) {
  const langLower = (lang || "es").toLowerCase();
  const isEnglish = langLower.startsWith("en");

  const systemPrompt =
    (isEnglish
      ? `You are Esteborg ERPev, an independent advisor that helps companies evaluate ERP systems.\n`
      : `Eres Esteborg ERPev, un asesor independiente que ayuda a evaluar sistemas ERP.\n`) +
    `No vendes ningún ERP en particular. Tu objetivo es que la empresa no compre un sistema innecesario o sobredimensionado.\n` +
    `Haces preguntas sobre:\n` +
    `- tamaño de la empresa\n` +
    `- industria\n` +
    `- procesos críticos\n` +
    `- problemas actuales con su ERP o con Excel\n` +
    `- presupuesto y horizonte de implementación\n\n` +
    `Hablas en máximo 10 líneas, tono ejecutivo y claro.\n`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history) ? history : []),
    {
      role: "user",
      content: userName ? `Usuario: ${userName}\n${message}` : message,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
  });

  return (
    completion?.choices?.[0]?.message?.content ||
    "Para ayudarte, dime en breve: industria, país, tamaño de empresa y principales dolores con tu sistema actual."
  );
}

// -------------------------------------------------------------
// RUTA DEMO: /api/demo/welcome
// -------------------------------------------------------------
app.post("/api/demo/welcome", async (req, res) => {
  try {
    const { message, userName, history, lang } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "bad_request",
        message: "El campo 'message' es obligatorio.",
      });
    }

    const langLower = (lang || "es").toLowerCase();

    const MAX_DEMO_INTERACTIONS = 14;
    const userMessagesCount = Array.isArray(history)
      ? history.filter((m) => m && m.role === "user").length + 1
      : 1;

    const remainingInteractions = Math.max(
      0,
      MAX_DEMO_INTERACTIONS - userMessagesCount
    );

    const reply = await getDemoWelcomeReply({
      message,
      history: Array.isArray(history) ? history : [],
      userName,
      interactionCount: userMessagesCount,
      remainingInteractions,
      lang: langLower,
    });

    const demoStatus = remainingInteractions <= 0 ? "ended" : "active";

    return res.json({
      reply,
      demoStatus,
      remainingInteractions,
    });
  } catch (err) {
    console.error("❌ Error en /api/demo/welcome:", err);
    return res.status(500).json({
      error: "internal_error",
      message: "Error inesperado en la demo de bienvenida.",
    });
  }
});

// ------------------------------
//   4) RUTA TTS EXTERNO (ElevenLabs)
// ------------------------------
app.post("/api/tts", async (req, res) => {
  try {
    const { text, lang } = req.body || {};

    if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID_ES) {
      return res.status(500).json({
        error: "config_error",
        message:
          "Falta ELEVENLABS_API_KEY o ELEVENLABS_VOICE_ID_ES en el servidor.",
      });
    }

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: "bad_request",
        message: "El campo 'text' es obligatorio para TTS.",
      });
    }

    const langLower = (lang || "es").toLowerCase();
    const voiceId = langLower.startsWith("en")
      ? ELEVENLABS_VOICE_ID_EN
      : ELEVENLABS_VOICE_ID_ES;

    // Recorte para evitar audios raros/cortados
    const safeText = text.length > 400 ? text.slice(0, 400) : text;

    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: safeText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.85,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error("ElevenLabs TTS error:", errText);
      return res
        .status(ttsRes.status)
        .json({ error: "TTS provider error", details: errText });
    }

    const arrayBuffer = await ttsRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);
  } catch (err) {
    console.error("Error en /api/tts:", err);
    return res.status(500).json({ error: "Internal TTS error" });
  }
});

// -------------------------------------------------------------
// RUTA PREMIUM PRINCIPAL: /api/esteborg88full
// -------------------------------------------------------------
app.post("/api/esteborg88full", async (req, res) => {
  try {
    const { message, rawToken, userName, history, lang } = req.body || {};
    const tokenResult = validateTokken(rawToken);

    if (tokenResult.status !== "valid") {
      return res.status(401).json({
        error: "invalid_token",
        reason: tokenResult.reason,
      });
    }

    const reply = await getEsteborgReply({
      message,
      history,
      userName,
      lang,
    });

    return res.json({
      module: "esteborg88full",
      reply,
      tokenStatus: "valid",
      tokenInfo: tokenResult.raw,
    });
  } catch (err) {
    console.error("❌ Error en /api/esteborg88full:", err);
    return res.status(500).json({
      error: "internal_error",
      message: "Error inesperado en módulo Esteborg88Full.",
    });
  }
});

// -------------------------------------------------------------
// RUTA MÓDULO COMUNICA
// -------------------------------------------------------------
app.post("/api/modules/comunica", async (req, res) => {
  try {
    const { message, rawToken, userName, history, lang } = req.body || {};
    const tokenResult = validateTokken(rawToken);

    if (tokenResult.status !== "valid") {
      return res.status(401).json({
        error: "invalid_token",
        reason: tokenResult.reason,
      });
    }

    const reply = await getComunicaReply({
      message,
      history,
      userName,
      lang,
    });

    return res.json({
      module: "comunica",
      reply,
      tokenStatus: "valid",
      tokenInfo: tokenResult.raw,
    });
  } catch (err) {
    console.error("❌ Error en /api/modules/comunica:", err);
    return res.status(500).json({
      error: "internal_error",
      message: "Error inesperado en módulo Comunica.",
    });
  }
});

// -------------------------------------------------------------
// RUTA MÓDULO VENTAS
// -------------------------------------------------------------
app.post("/api/modules/ventas", async (req, res) => {
  try {
    const { message, rawToken, userName, history, lang } = req.body || {};
    const tokenResult = validateTokken(rawToken);

    if (tokenResult.status !== "valid") {
      return res.status(401).json({
        error: "invalid_token",
        reason: tokenResult.reason,
      });
    }

    const reply = await getVentasReply({
      message,
      history,
      userName,
      lang,
    });

    return res.json({
      module: "ventas",
      reply,
      tokenStatus: "valid",
      tokenInfo: tokenResult.raw,
    });
  } catch (err) {
    console.error("❌ Error en /api/modules/ventas:", err);
    return res.status(500).json({
      error: "internal_error",
      message: "Error inesperado en módulo Ventas.",
    });
  }
});

// -------------------------------------------------------------
// RUTA MÓDULO CLARIDAD
// -------------------------------------------------------------
app.post("/api/modules/claridad", async (req, res) => {
  try {
    const { message, rawToken, userName, history, lang } = req.body || {};
    const tokenResult = validateTokken(rawToken);

    if (tokenResult.status !== "valid") {
      return res.status(401).json({
        error: "invalid_token",
        reason: tokenResult.reason,
      });
    }

    const reply = await getClarityReply({
      message,
      history,
      userName,
      lang,
    });

    return res.json({
      module: "claridad",
      reply,
      tokenStatus: "valid",
      tokenInfo: tokenResult.raw,
    });
  } catch (err) {
    console.error("❌ Error en /api/modules/claridad:", err);
    return res.status(500).json({
      error: "internal_error",
      message: "Error inesperado en módulo Claridad.",
    });
  }
});

// -------------------------------------------------------------
// RUTA MÓDULO ERPev
// -------------------------------------------------------------
app.post("/api/modules/erpev", async (req, res) => {
  try {
    const { message, rawToken, userName, history, lang } = req.body || {};
    const tokenResult = validateTokken(rawToken);

    if (tokenResult.status !== "valid") {
      return res.status(401).json({
        error: "invalid_token",
        reason: tokenResult.reason,
      });
    }

    const reply = await getErpEvalReply({
      message,
      history,
      userName,
      lang,
    });

    return res.json({
      module: "erpev",
      reply,
      tokenStatus: "valid",
      tokenInfo: tokenResult.raw,
    });
  } catch (err) {
    console.error("❌ Error en /api/modules/erpev:", err);
    return res.status(500).json({
      error: "internal_error",
      message: "Error inesperado en módulo ERPev.",
    });
  }
});

// -------------------------------------------------------------
// SALUD
// -------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Backend Esteborg OK");
});

// -------------------------------------------------------------
// START
// -------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Esteborg backend en puerto ${PORT}`);
});

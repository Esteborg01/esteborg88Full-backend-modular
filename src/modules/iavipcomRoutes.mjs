// src/modules/iavipcomRoutes.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

const FALLBACK_BY_LANG = {
  es: `¡Qué gusto saludarte! 😊 Antes de entrar a tu entrenamiento necesito tu Tokken Esteborg Members para validar tu acceso.

Pega tu Tokken aquí abajo ⬇️

Si aún no tienes Tokken, puedes obtenerlo o recuperarlo en:
https://membersvip.esteborg.live/#miembrosvip`,
  en: `Great to see you here! 😊 Before we start your AI training I need your Esteborg Members Tokken to validate your access.

Paste your token below ⬇️

If you don’t have it yet, you can get or recover it at:
https://membersvip.esteborg.live/#miembrosvip`,
  pt: `Que bom ter você aqui! 😊 Antes de começarmos seu treinamento de IA preciso do seu Tokken Esteborg Members para validar o acesso.

Cole o seu tokken aqui embaixo ⬇️

Se ainda não tiver, você pode obtê-lo ou recuperá-lo em:
https://membersvip.esteborg.live/#miembrosvip`,
  fr: `Ravi de te voir ici ! 😊 Avant de commencer ton entraînement IA, j’ai besoin de ton Tokken Esteborg Members pour valider ton accès.

Colle ton token ci-dessous ⬇️

Si tu n’en as pas encore, tu peux l’obtenir ou le récupérer sur :
https://membersvip.esteborg.live/#miembrosvip`,
  it: `Che bello vederti qui! 😊 Prima di iniziare il tuo training IA ho bisogno del tuo Tokken Esteborg Members per convalidare l’accesso.

Incolla il tuo tokken qui sotto ⬇️

Se non ce l’hai ancora, puoi ottenerlo o recuperarlo su:
https://membersvip.esteborg.live/#miembrosvip`,
  de: `Wie schön, dich hier zu sehen! 😊 Bevor wir mit deinem KI-Training starten, brauche ich dein Esteborg Members Tokken zur Zugriffsbestätigung.

Füge dein Tokken unten ein ⬇️

Wenn du es noch nicht hast, kannst du es hier erhalten oder wiederherstellen:
https://membersvip.esteborg.live/#miembrosvip`,
};

// ===============================
// SESSION ENGINE (in-memory)
// ===============================
const ACTIVE_SESSIONS = new Map();
const SESSION_TTL = 1000 * 60 * 60 * 4; // 4 horas

function normalizeLang(lang) {
  const key = typeof lang === "string" ? lang.toLowerCase() : "es";
  return FALLBACK_BY_LANG[key] ? key : "es";
}

function getEffectiveToken(req, body = {}) {
  const { rawToken, token: bodyToken } = body;

  const headerToken = req.headers["x-esteborg-token"];

  const authHeader = req.headers["authorization"];
  const bearerToken =
    typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

  return rawToken || bodyToken || headerToken || bearerToken || null;
}

function getOrInitSession(effectiveToken, langKey) {
  let session = ACTIVE_SESSIONS.get(effectiveToken) || null;

  // TTL
  if (session && Date.now() - session.createdAt > SESSION_TTL) {
    ACTIVE_SESSIONS.delete(effectiveToken);
    session = null;
  }

  if (!session) {
    session = {
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      lang: langKey,
      turn: 0,
      // “Dónde se quedó”
      memory: {
        userName: "",
        goal90: "",
        lastUserMessage: "",
        lastAssistantMessage: "",
        lastFocus: "", // ej: "ensayos", "presentaciones", "marketing", etc.
      },
    };
    ACTIVE_SESSIONS.set(effectiveToken, session);
  } else {
    session.lastSeenAt = Date.now();
    session.lang = langKey;
  }

  return session;
}

export function registerIaVipComRoutes(app, openai) {
  app.post("/api/modules/iavipcom", async (req, res) => {
    try {
      const { message, userName, history, lang } = req.body || {};

      const langKey = normalizeLang(lang);
      const effectiveToken = getEffectiveToken(req, req.body || {});
      const tokenResult = validateTokken(effectiveToken);

      // 🔐 Tokken inválido / ausente → pide Tokken
      if (tokenResult.status !== "valid") {
        const fallbackReply = FALLBACK_BY_LANG[langKey];
        return res.json({
          module: "iavipcom",
          reply: fallbackReply,
          tokenStatus: tokenResult.status,
          tokenInfo: tokenResult,
        });
      }

      // ✅ Tokken válido pero sin mensaje → error de cliente
      if (!message || typeof message !== "string") {
        return res.status(400).json({
          error: "missing_message",
          message: "Falta el mensaje del usuario.",
        });
      }

      // ✅ Sesión por Tokken
      const session = getOrInitSession(effectiveToken, langKey);

      // Guardar nombre si viene
      if (typeof userName === "string" && userName.trim()) {
        session.memory.userName = userName.trim();
      }

      // Guardar último mensaje usuario
      session.memory.lastUserMessage = message.trim();

      // ✅ Cerebro
      const reply = await getIaVipComReply(openai, {
        message,
        history,
        userName: session.memory.userName || userName || "",
        lang: langKey,
        // userId real “DB-ready”: por ahora usamos token; luego puedes usar personUid si lo traes
        userId: (tokenResult?.tokenInfo?.personUid || effectiveToken || "anon"),
        session,
      });

      // Guardar último mensaje assistant + turn
      session.turn += 1;
      session.memory.lastAssistantMessage = String(reply || "").slice(0, 1200);

      return res.json({
        module: "iavipcom",
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult.tokenInfo,
        // (Opcional) debug
        // session: { turn: session.turn, lang: session.lang }
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/iavipcom:", err);
      return res.status(500).json({
        error: "internal_error",
        message: "Ocurrió un error inesperado en el módulo Esteborg IA (VIP).",
      });
    }
  });
}

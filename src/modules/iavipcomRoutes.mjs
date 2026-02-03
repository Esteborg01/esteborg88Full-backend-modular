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
// SESSION CACHE (4h TTL)
// ===============================
const ACTIVE_SESSIONS = new Map();
const SESSION_TTL = 1000 * 60 * 60 * 4; // 4 horas

function normalizeLang(lang) {
  return typeof lang === "string" && FALLBACK_BY_LANG[lang] ? lang : "es";
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && typeof m === "object")
    .map((m) => ({
      role: m.role === "assistant" || m.role === "user" ? m.role : "user",
      content: typeof m.content === "string" ? m.content : String(m.content ?? ""),
    }))
    .filter((m) => m.content.trim().length > 0);
}

function buildStableUserId(tokenInfo = {}, userName = "") {
  if (typeof tokenInfo.email === "string" && tokenInfo.email.trim()) {
    return tokenInfo.email.trim().toLowerCase();
  }
  if (typeof tokenInfo.accountUid === "string" && tokenInfo.accountUid.trim()) {
    return `acc:${tokenInfo.accountUid.trim()}`;
  }
  if (typeof tokenInfo.personUid === "string" && tokenInfo.personUid.trim()) {
    return `person:${tokenInfo.personUid.trim()}`;
  }
  if (typeof userName === "string" && userName.trim()) {
    return `name:${userName.trim().toLowerCase()}`;
  }
  return "anon";
}

export function registerIaVipComRoutes(app, openai) {
  app.post("/api/modules/iavipcom", async (req, res) => {
    try {
      const { message, rawToken, token: bodyToken, userName, history, lang } = req.body || {};

      // También aceptamos token en header para unificar con otros módulos
      const headerToken = req.headers["x-esteborg-token"];

      const authHeader = req.headers["authorization"];
      const bearerToken =
        typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : null;

      const effectiveToken = rawToken || bodyToken || headerToken || bearerToken;

      const langKey = normalizeLang(lang);

      // ===============================
      // SESSION TTL CHECK
      // ===============================
      let session = effectiveToken ? ACTIVE_SESSIONS.get(effectiveToken) : null;

      if (session && Date.now() - session.createdAt > SESSION_TTL) {
        ACTIVE_SESSIONS.delete(effectiveToken);
        session = null;
      }

      // ===============================
      // VALIDATE TOKEN (only if no session)
      // ===============================
      if (!session) {
        const tokenResult = validateTokken(effectiveToken);

        // Tokken inválido / ausente → pide Tokken
        if (tokenResult.status !== "valid") {
          const fallbackReply = FALLBACK_BY_LANG[langKey];
          return res.json({
            module: "iavipcom",
            reply: fallbackReply,
            tokenStatus: tokenResult.status,
            tokenInfo: tokenResult,
          });
        }

        session = {
          tokenInfo: tokenResult.tokenInfo || {},
          createdAt: Date.now(),
        };

        // Guardamos sesión para no revalidar en cada request
        ACTIVE_SESSIONS.set(effectiveToken, session);
      }

      // ✅ Tokken válido pero sin mensaje → error de cliente
      if (!message || typeof message !== "string") {
        return res.status(400).json({
          error: "missing_message",
          message: "Falta el mensaje del usuario.",
        });
      }

      const safeHistory = sanitizeHistory(history);
      const stableUserId = buildStableUserId(session.tokenInfo, userName);

      // ✅ Tokken válido y mensaje correcto → llamamos al cerebro IAvip
      const reply = await getIaVipComReply(openai, {
        message,
        history: safeHistory,
        userName,
        lang: langKey,
        userId: stableUserId,
      });

      return res.json({
        module: "iavipcom",
        reply,
        tokenStatus: "valid",
        tokenInfo: session.tokenInfo,
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

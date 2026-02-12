// src/modules/iavipcomRoutes.mjs

import { requireAuth } from "../middleware/requireAuth.mjs";
import { requireVip } from "../middleware/requireVip.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

const FALLBACK_BY_LANG = {
  es: `¡Qué gusto saludarte! 😊 Para usar Esteborg IA VIP necesitas iniciar sesión y enviar tu token (JWT).

Si estás probando en Thunder Client:
1) Primero haz login en /api/auth/login
2) Copia el token
3) En tu request a /api/modules/iavipcom agrega Header:
Authorization: Bearer TU_TOKEN`,
  en: `Great to see you! 😊 To use Esteborg IA VIP you must log in and send your token (JWT).

If you're testing in Thunder Client:
1) Login at /api/auth/login
2) Copy the token
3) Add header:
Authorization: Bearer YOUR_TOKEN`,
  pt: `Que bom te ver! 😊 Para usar Esteborg IA VIP você precisa fazer login e enviar seu token (JWT).

No Thunder Client:
1) Faça login em /api/auth/login
2) Copie o token
3) Header:
Authorization: Bearer SEU_TOKEN`,
  fr: `Ravi de te voir ! 😊 Pour utiliser Esteborg IA VIP, tu dois te connecter et envoyer ton token (JWT).

Dans Thunder Client :
1) Login sur /api/auth/login
2) Copie le token
3) Header:
Authorization: Bearer TON_TOKEN`,
  it: `Che bello vederti! 😊 Per usare Esteborg IA VIP devi fare login e inviare il tuo token (JWT).

In Thunder Client:
1) Login su /api/auth/login
2) Copia il token
3) Header:
Authorization: Bearer IL_TUO_TOKEN`,
  de: `Schön, dich zu sehen! 😊 Um Esteborg IA VIP zu nutzen, musst du dich anmelden und dein Token (JWT) senden.

In Thunder Client:
1) Login unter /api/auth/login
2) Token kopieren
3) Header:
Authorization: Bearer DEIN_TOKEN`,
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

function getOrInitSession(sessionKey, langKey) {
  let session = ACTIVE_SESSIONS.get(sessionKey) || null;

  // TTL
  if (session && Date.now() - session.createdAt > SESSION_TTL) {
    ACTIVE_SESSIONS.delete(sessionKey);
    session = null;
  }

  if (!session) {
    session = {
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      lang: langKey,
      turn: 0,
      memory: {
        userName: "",
        goal90: "",
        lastUserMessage: "",
        lastAssistantMessage: "",
        lastFocus: "",
      },
    };
    ACTIVE_SESSIONS.set(sessionKey, session);
  } else {
    session.lastSeenAt = Date.now();
    session.lang = langKey;
  }

  return session;
}

export function registerIaVipComRoutes(app, openai) {
  app.post(
    "/api/modules/iavipcom",
    requireAuth,
    requireVip({ moduleKey: "iavipcom" }),
    async (req, res) => {
      try {
        const { message, userName, history, lang } = req.body || {};
        const langKey = normalizeLang(lang);

        // ✅ Si por alguna razón no llega message
        if (!message || typeof message !== "string") {
          return res.status(400).json({
            ok: false,
            error: "missing_message",
            message: "Falta el mensaje del usuario.",
          });
        }

        // ✅ Session key por usuario (JWT sub)
        const sessionKey = req.user?.sub || req.user?.email || "anon";
        const session = getOrInitSession(sessionKey, langKey);

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
          userId: sessionKey,
          session,
        });

        // Guardar último mensaje assistant + turn
        session.turn += 1;
        session.memory.lastAssistantMessage = String(reply || "").slice(0, 1200);

        return res.json({
          ok: true,
          module: "iavipcom",
          reply,
          // info útil opcional (sin exponer cosas sensibles)
          user: {
            email: req.userDb?.email,
            plan: req.userDb?.plan,
            vipExpiresAt: req.userDb?.vipExpiresAt,
          },
        });
      } catch (err) {
        console.error("❌ Error en /api/modules/iavipcom:", err);
        const langKey = normalizeLang(req.body?.lang);
        return res.status(500).json({
          ok: false,
          error: "internal_error",
          message: FALLBACK_BY_LANG[langKey] || "Error interno.",
        });
      }
    }
  );
}

// src/modules/erpevRoutes.mjs

import { validateTokken } from "../utils/tokken.mjs";
import { getErpevReply } from "../services/erpevService.mjs";

const FALLBACK_BY_LANG = {
  es: `¡Qué gusto saludarte! 😊 Antes de entrar a la evaluación avanzada de tu ERP necesito tu Tokken Esteborg Members para validar tu acceso.

Pega tu Tokken aquí abajo ⬇️

Si aún no tienes Tokken, puedes obtenerlo o recuperarlo en:
https://membersvip.esteborg.live/#miembrosvip`,
  en: `Great to see you here! 😊 Before we start your advanced ERP evaluation I need your Esteborg Members Tokken to validate your access.

Paste your token below ⬇️

If you don’t have it yet, you can get or recover it at:
https://membersvip.esteborg.live/#miembrosvip`,
  pt: `Que bom ter você aqui! 😊 Antes de começarmos a avaliação avançada do seu ERP preciso do seu Tokken Esteborg Members para validar o acesso.

Cole o seu tokken aqui embaixo ⬇️

Se ainda não tiver, você pode obtê-lo ou recuperá-lo em:
https://membersvip.esteborg.live/#miembrosvip`,
  fr: `Ravi de te voir ici ! 😊 Avant de commencer l’évaluation avancée de ton ERP, j’ai besoin de ton Tokken Esteborg Members pour valider ton accès.

Colle ton token ci-dessous ⬇️

Si tu n’en as pas encore, tu peux l’obtenir ou le récupérer sur :
https://membersvip.esteborg.live/#miembrosvip`,
  it: `Che bello vederti qui! 😊 Prima di iniziare la valutazione avanzata del tuo ERP ho bisogno del tuo Tokken Esteborg Members per convalidare l’accesso.

Incolla il tuo tokken qui sotto ⬇️

Se non ce l’hai ancora, puoi ottenerlo o recuperarlo su:
https://membersvip.esteborg.live/#miembrosvip`,
  de: `Wie schön, dich hier zu sehen! 😊 Bevor wir mit deiner erweiterten ERP-Bewertung starten, brauche ich dein Esteborg Members Tokken zur Zugriffsbestätigung.

Füge dein Tokken unten ein ⬇️

Wenn du es noch nicht hast, kannst du es hier erhalten oder wiederherstellen:
https://membersvip.esteborg.live/#miembrosvip`,
};

export function registerErpevRoutes(app, openai) {
  app.post("/api/modules/erpev", async (req, res) => {
    try {
      const {
        message,
        rawToken,
        token: bodyToken,
        userName,
        history,
        lang,
      } = req.body || {};

      // También aceptamos token en header para unificar con otros módulos
      const headerToken = req.headers["x-esteborg-token"];
      const effectiveToken = rawToken || bodyToken || headerToken;

      // Validar Tokken Esteborg Members
      const tokenResult = validateTokken(effectiveToken);

      const langKey =
        typeof lang === "string" && FALLBACK_BY_LANG[lang]
          ? lang
          : "es";

      // 🔐 Tokken inválido / ausente → mensaje de "pide tu Tokken"
      if (tokenResult.status !== "valid") {
        const fallbackReply = FALLBACK_BY_LANG[langKey];

        return res.json({
          module: "erpev",
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

      // ✅ Tokken válido y mensaje correcto → llamamos al cerebro ERPev
      const reply = await getErpevReply(openai, {
        message,
        history,
        userName,
        lang: langKey,
      });

      return res.json({
        module: "erpev",
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult.tokenInfo,
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/erpev:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en el módulo Esteborg ERPev (Evaluación avanzada de sistemas ERP).",
      });
    }
  });
}

// src/modules/iavipcomRoutes.mjs

import { Router } from "express";
import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

const router = Router();

/**
 * Registro de rutas para el módulo Esteborg IA – Despliega todo tu poder (IA VIP).
 *
 * Endpoint principal:
 *   POST /api/modules/iavipcom
 *
 * Body esperado:
 *   {
 *     message: string,
 *     rawToken?: string,
 *     token?: string,
 *     history?: Array<{ role: "user" | "assistant" | "system", content: string }>,
 *     userName?: string,
 *     lang?: string
 *   }
 *
 * También puede recibir el token en el header:
 *   x-esteborg-token: string
 */
export function registerIaVipComRoutes(app, openai) {
  router.post("/iavipcom", async (req, res) => {
    try {
      const {
        message,
        rawToken,
        token: bodyToken,
        history = [],
        userName,
        lang = "es",
      } = req.body || {};

      const headerToken = req.headers["x-esteborg-token"];
      const effectiveToken = rawToken || bodyToken || headerToken;

      // Llamamos a validateTokken para aprovechar la misma lógica que usan los demás módulos.
      const tokenResult = validateTokken(effectiveToken);

      // Política conservadora:
      // - Si NO hay token → no pasa.
      // - Si la función devuelve algo claramente inválido (false, { valid: false }, { status: "invalid" }) → no pasa.
      let tokenIsValid = false;

      if (effectiveToken) {
        if (tokenResult === true) {
          tokenIsValid = true;
        } else if (tokenResult && typeof tokenResult === "object") {
          if (tokenResult.valid === true) tokenIsValid = true;
          if (tokenResult.status === "valid") tokenIsValid = true;
          // Si no está explícitamente marcado como inválido, pero hay token,
          // puedes decidir ser más estricto aquí. Por ahora, respetamos flags obvios.
          if (tokenResult.valid === false || tokenResult.status === "invalid") {
            tokenIsValid = false;
          }
        }
      }

      if (!tokenIsValid) {
        const fallbackReply =
          "Bienvenido a Esteborg IA – Despliega todo tu poder.\n\n" +
          "Para continuar necesito tu Tokken Esteborg Members. " +
          "Pégalo aquí en el chat y, cuando esté validado, podremos trabajar a fondo " +
          "en tu entrenamiento en Inteligencia Artificial aplicada a tu vida personal y profesional.";

        return res.status(401).json({
          module: "iavipcom",
          reply: fallbackReply,
          tokenStatus: "invalid",
          tokenInfo: tokenResult ?? null,
        });
      }

      if (!message || typeof message !== "string") {
        return res.status(400).json({
          module: "iavipcom",
          error: "missing_message",
          message: "Falta el mensaje del usuario (message).",
        });
      }

      const reply = await getIaVipComReply(openai, {
        message,
        history,
        userName,
        lang,
      });

      return res.json({
        module: "iavipcom",
        reply,
        tokenStatus: "valid",
        tokenInfo: tokenResult ?? { token: effectiveToken },
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/iavipcom:", err);
      return res.status(500).json({
        module: "iavipcom",
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en el módulo Esteborg IA – Despliega todo tu poder.",
      });
    }
  });

  // Montamos el router bajo el prefijo estándar de módulos:
  app.use("/api/modules", router);
}

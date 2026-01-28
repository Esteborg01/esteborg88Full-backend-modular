// src/modules/iavipcomRoutes.mjs

import { Router } from "express";
import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";
import { updateUserProgress } from "../utils/progressStore.mjs";

const router = Router();

/**
 * Extrae etiquetas [ESTEBORG_EVENT ...] del texto devuelto por la IA
 * y regresa el texto limpio + lista de eventos.
 */
function extractEsteborgEvents(text) {
  const events = [];
  if (!text || typeof text !== "string") {
    return { cleanText: text, events };
  }

  const regex = /\[ESTEBORG_EVENT\s+([^\]]+)\]/g;
  let match;
  let cleanText = text;

  while ((match = regex.exec(text)) !== null) {
    const inner = match[1]; // ej: type="module_completed" module="1"
    const event = {};
    const kvRegex = /(\w+)\s*=\s*"([^"]*)"/g;
    let kv;
    while ((kv = kvRegex.exec(inner)) !== null) {
      const key = kv[1];
      const value = kv[2];
      event[key] = value;
    }
    if (Object.keys(event).length > 0) {
      events.push(event);
    }
  }

  // Eliminar las etiquetas del texto que verá el usuario
  cleanText = text.replace(regex, "").trim();

  return { cleanText, events };
}

export function registerIaVipComRoutes(app, openai) {
  router.post("/api/modules/iavipcom", async (req, res) => {
    try {
      const {
        message,
        rawToken,
        token: bodyToken,
        history,
        userName,
        lang,
      } = req.body || {};

      if (!message || typeof message !== "string") {
        return res.status(400).json({
          error: "missing_message",
          message: "El campo 'message' es requerido.",
        });
      }

      // Validar tokken
      const tokenStr = rawToken || bodyToken || "";
      const tokenResult = validateTokken(tokenStr);
      const tokenInfo = tokenResult?.tokenInfo || null;
      const email = tokenInfo?.email || null;

      // Llamar al servicio IA
      const replyRaw = await getIaVipComReply(openai, {
        message,
        history,
        userName,
        lang,
      });

      // Extraer eventos de progreso
      const { cleanText: reply, events } = extractEsteborgEvents(replyRaw);

      let progress = null;
      if (events && events.length > 0) {
        for (const ev of events) {
          progress = updateUserProgress(email, ev) || progress;
        }
      }

      return res.json({
        reply,
        tokenStatus: tokenResult?.status || "valid",
        tokenInfo,
        progressEvents: events,
        progress,
      });
    } catch (err) {
      console.error("❌ Error en /api/modules/iavipcom:", err);
      return res.status(500).json({
        error: "internal_error",
        message:
          "Ocurrió un error inesperado en el módulo Esteborg IA - Despliega todo tu poder.",
      });
    }
  });

  // Montar router en la raíz, igual que otros módulos
  app.use("/", router);
}

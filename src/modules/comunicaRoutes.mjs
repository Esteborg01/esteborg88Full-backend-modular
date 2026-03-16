// src/modules/comunicaRoutes.mjs

import { requireAuth } from "../middleware/requireAuth.mjs";
import { requireVip } from "../middleware/requireVip.mjs";
import { requireDailyQuota } from "../middleware/requireDailyQuota.mjs";
import { getCom7Reply } from "../services/comunicaService.mjs";
import {
  getAiCachedReply,
  saveAiCachedReply,
} from "../services/aiCacheService.mjs";
import {
  consumeDailyQuota,
  getQuotaSnapshot,
} from "../services/quotaService.mjs";

export function registerComunicaRoutes(app, openai) {
  app.post(
    "/api/modules/comunica",
    requireAuth,
    requireVip({ moduleKey: "comunica" }),
    requireDailyQuota({ moduleKey: "comunica" }),
    async (req, res) => {
      try {
        const { message, userName, history } = req.body || {};

        if (!message || typeof message !== "string") {
          return res.status(400).json({
            ok: false,
            module: "comunica",
            error: "missing_message",
            message: "Falta el mensaje del usuario.",
          });
        }

        const plan = req.userDb?.plan || "vip";
        const email = req.userDb?.email || req.user?.email || "";
        const effectiveUserName = userName || "";

        const cached = await getAiCachedReply({
          moduleKey: "comunica",
          message,
          history,
          lang: "es",
          userName: effectiveUserName,
          plan,
        });

        if (cached.hit) {
          const quota = await getQuotaSnapshot(email, plan);

          return res.json({
            ok: true,
            module: "comunica",
            reply: cached.reply,
            cache: {
              hit: true,
              key: cached.cacheKey,
            },
            user: {
              email: req.userDb?.email,
              plan: req.userDb?.plan,
              vipExpiresAt: req.userDb?.vipExpiresAt,
            },
            quota,
          });
        }

        const quotaConsumed = await consumeDailyQuota({
          email,
          plan,
          moduleKey: "comunica",
        });

        if (!quotaConsumed.allowed) {
          return res.status(429).json({
            ok: false,
            error: "daily_quota_exceeded",
            message: "Ya alcanzaste tu límite diario de prompts.",
            quota: {
              date: quotaConsumed.dateKey,
              used: quotaConsumed.used,
              limit: quotaConsumed.limit,
              remaining: quotaConsumed.remaining,
            },
          });
        }

        const reply = await getCom7Reply(openai, {
          message,
          history,
          userName,
        });

        await saveAiCachedReply({
          moduleKey: "comunica",
          message,
          history,
          lang: "es",
          userName: effectiveUserName,
          plan,
          reply,
        });

        return res.json({
          ok: true,
          module: "comunica",
          reply,
          cache: {
            hit: false,
          },
          user: {
            email: req.userDb?.email,
            plan: req.userDb?.plan,
            vipExpiresAt: req.userDb?.vipExpiresAt,
          },
          quota: {
            date: quotaConsumed.dateKey,
            used: quotaConsumed.used,
            limit: quotaConsumed.limit,
            remaining: quotaConsumed.remaining,
          },
        });
      } catch (err) {
        console.error("❌ Error en /api/modules/comunica:", err);
        return res.status(500).json({
          ok: false,
          module: "comunica",
          error: "internal_error",
          message:
            "Ocurrió un error inesperado en el módulo EsteborgCom7 (Comunicación con IE).",
        });
      }
    }
  );
}

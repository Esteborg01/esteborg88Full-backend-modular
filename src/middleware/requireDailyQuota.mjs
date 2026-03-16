// src/middleware/requireDailyQuota.mjs

import { canConsumeDailyQuota } from "../services/quotaService.mjs";

export function requireDailyQuota({ moduleKey }) {
  return async function quotaMiddleware(req, res, next) {
    try {
      const email =
        req.userDb?.email ||
        req.user?.email ||
        req.user?.sub ||
        "";

      const plan =
        req.userDb?.plan ||
        req.user?.plan ||
        "vip";

      if (!email) {
        return res.status(401).json({
          ok: false,
          error: "user_email_missing",
          message: "No se pudo identificar el usuario para validar cuota.",
        });
      }

      const quota = await canConsumeDailyQuota({
        email,
        plan,
        moduleKey,
      });

      if (!quota.allowed) {
        return res.status(429).json({
          ok: false,
          error: "daily_quota_exceeded",
          message: "Ya alcanzaste tu límite diario de prompts.",
          quota: {
            date: quota.dateKey,
            used: quota.used,
            limit: quota.limit,
            remaining: quota.remaining,
          },
        });
      }

      req.quota = {
        date: quota.dateKey,
        used: quota.used,
        limit: quota.limit,
        remaining: quota.remaining,
      };

      next();
    } catch (err) {
      console.error("❌ Quota middleware error:", err);
      return res.status(500).json({
        ok: false,
        error: "quota_validation_failed",
      });
    }
  };
}

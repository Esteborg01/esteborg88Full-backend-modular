import { getDb } from "../config/mongoClient.mjs";

export function requireVip({ moduleKey } = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ ok: false, error: "invalid_token_payload" });
      }

      const db = await getDb();
      const users = db.collection("users");

      // ⚠️ _id en Mongo es ObjectId, lo convertimos
      const { ObjectId } = await import("mongodb");
      const user = await users.findOne({ _id: new ObjectId(userId) });

      if (!user) {
        return res.status(401).json({ ok: false, error: "user_not_found" });
      }

      // status
      if (user.status !== "active") {
        return res.status(403).json({ ok: false, error: "user_inactive" });
      }

      // vigencia VIP
      if (!user.vipExpiresAt || new Date(user.vipExpiresAt).getTime() <= Date.now()) {
        return res.status(403).json({ ok: false, error: "vip_expired" });
      }

      // módulo permitido (si se especifica)
      if (moduleKey) {
        const allowed = Array.isArray(user.modulesAllowed) ? user.modulesAllowed : [];
        if (!allowed.includes(moduleKey)) {
          return res.status(403).json({ ok: false, error: "module_not_allowed" });
        }
      }

      // Adjuntamos user real por si lo ocupas
      req.userDb = {
        email: user.email,
        plan: user.plan,
        modulesAllowed: user.modulesAllowed || [],
        vipExpiresAt: user.vipExpiresAt,
      };

      return next();
    } catch (err) {
      console.error("requireVip error:", err);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  };
}

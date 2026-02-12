import express from "express";
import bcrypt from "bcryptjs";
import { getDb } from "../config/mongoClient.mjs";
import { addDays, getVipDurationDays } from "../core/vipRules.mjs";

const router = express.Router();

// ✅ Registro (crea user + vipExpiresAt)
router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, plan, modulesAllowed } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email_and_password_required" });
    }

    const db = await getDb();
    const users = db.collection("users");

    const existing = await users.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ ok: false, error: "email_already_exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const safePlan = plan === "ia90" ? "ia90" : "vip30";
    const days = getVipDurationDays(safePlan);

    const vipExpiresAt = addDays(new Date(), days);

    const userDoc = {
      email: email.toLowerCase().trim(),
      passwordHash,
      plan: safePlan,
      modulesAllowed: Array.isArray(modulesAllowed) ? modulesAllowed : [],
      vipExpiresAt,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await users.insertOne(userDoc);

    return res.status(201).json({
      ok: true,
      email: userDoc.email,
      plan: userDoc.plan,
      vipExpiresAt: userDoc.vipExpiresAt,
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;

import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { Resend } from "resend";

import { getDb } from "../config/mongoClient.mjs";
import { addDays, getVipDurationDays } from "../core/vipRules.mjs";

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

/* =====================================================
   Helpers
===================================================== */

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

function requireJwtSecret(res) {
  if (!process.env.JWT_SECRET) {
    res.status(500).json({ ok: false, error: "jwt_secret_missing" });
    return false;
  }
  return true;
}

/* =====================================================
   REGISTER
===================================================== */

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, plan, modulesAllowed } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email_and_password_required" });
    }

    const db = await getDb();
    const users = db.collection("users");

    const normalizedEmail = String(email).toLowerCase().trim();

    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ ok: false, error: "email_already_exists" });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    const safePlan = plan === "ia90" ? "ia90" : "vip30";
    const days = getVipDurationDays(safePlan);
    const vipExpiresAt = addDays(new Date(), days);

    await users.insertOne({
      email: normalizedEmail,
      passwordHash,
      plan: safePlan,
      modulesAllowed: Array.isArray(modulesAllowed) ? modulesAllowed : [],
      vipExpiresAt,
      status: "active",
      tokenVersion: 1, // 🔥 control de revocación
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   LOGIN
===================================================== */

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email_and_password_required" });
    }

    if (!requireJwtSecret(res)) return;

    const db = await getDb();
    const users = db.collection("users");

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) return res.status(401).json({ ok: false, error: "invalid_credentials" });

    const okPass = await bcrypt.compare(String(password), user.passwordHash);
    if (!okPass) return res.status(401).json({ ok: false, error: "invalid_credentials" });

    const token = jwt.sign(
      {
        sub: String(user._id),
        email: user.email,
        plan: user.plan,
        tv: user.tokenVersion || 1,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({ ok: true, token });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   ME
===================================================== */

router.get("/auth/me", async (req, res) => {
  try {
    if (!requireJwtSecret(res)) return;

    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ ok: false });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({
      _id: new ObjectId(String(payload.sub)),
    });

    if (!user) return res.status(404).json({ ok: false });

    if ((payload.tv || 1) !== (user.tokenVersion || 1)) {
      return res.status(401).json({ ok: false, error: "token_revoked" });
    }

    return res.json({
      ok: true,
      user: {
        email: user.email,
        plan: user.plan,
        vipExpiresAt: user.vipExpiresAt,
      },
    });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ ok: false });
  }
});

/* =====================================================
   LOGOUT ALL
===================================================== */

router.post("/auth/logoutAll", async (req, res) => {
  try {
    if (!requireJwtSecret(res)) return;

    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ ok: false });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false });
    }

    const db = await getDb();
    const users = db.collection("users");

    await users.updateOne(
      { _id: new ObjectId(String(payload.sub)) },
      { $inc: { tokenVersion: 1 }, $set: { updatedAt: new Date() } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("logoutAll error:", err);
    return res.status(500).json({ ok: false });
  }
});

/* =====================================================
   RESET PASSWORD
===================================================== */

router.post("/auth/reset", async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password)
      return res.status(400).json({ ok: false });

    if (String(password).length < 8)
      return res.status(400).json({ ok: false });

    if (!requireJwtSecret(res)) return;

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false });
    }

    const db = await getDb();
    const users = db.collection("users");

    const passwordHash = await bcrypt.hash(String(password), 12);

    await users.updateOne(
      { _id: new ObjectId(String(payload.sub)) },
      {
        $set: { passwordHash, updatedAt: new Date() },
        $inc: { tokenVersion: 1 },
      }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("reset error:", err);
    return res.status(500).json({ ok: false });
  }
});

export default router;

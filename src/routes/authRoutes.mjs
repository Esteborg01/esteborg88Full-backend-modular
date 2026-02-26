import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getDb } from "../config/mongoClient.mjs";
import { addDays, getVipDurationDays } from "../core/vipRules.mjs";

const router = express.Router();

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
   POST /api/auth/register
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

    const userDoc = {
      email: normalizedEmail,
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
    if (err?.code === 11000) {
      return res.status(409).json({ ok: false, error: "email_already_exists" });
    }

    console.error("register error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   LOGIN
   POST /api/auth/login
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
    if (!user) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    const okPass = await bcrypt.compare(String(password), user.passwordHash);
    if (!okPass) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    const token = jwt.sign(
      {
        sub: String(user._id),
        email: user.email,
        plan: user.plan,
        modulesAllowed: user.modulesAllowed || [],
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      ok: true,
      token,
      user: {
        email: user.email,
        plan: user.plan,
        modulesAllowed: user.modulesAllowed || [],
        vipExpiresAt: user.vipExpiresAt,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   ME
   GET /api/auth/me
===================================================== */

router.get("/auth/me", async (req, res) => {
  try {
    if (!requireJwtSecret(res)) return;

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "missing_token" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, error: "invalid_token" });
    }

    const db = await getDb();
    const users = db.collection("users");

    const userId = new ObjectId(String(payload.sub));
    const user = await users.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }

    return res.json({
      ok: true,
      user: {
        email: user.email,
        plan: user.plan,
        modulesAllowed: user.modulesAllowed || [],
        vipExpiresAt: user.vipExpiresAt,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   FORGOT PASSWORD
   POST /api/auth/forgot
===================================================== */

router.post("/auth/forgot", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ ok: false, error: "email_required" });
    }

    if (!requireJwtSecret(res)) return;

    const db = await getDb();
    const users = db.collection("users");
    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await users.findOne({ email: normalizedEmail });

    // Seguridad: siempre respondemos ok:true aunque no exista
    if (!user) return res.json({ ok: true });

    const resetToken = jwt.sign(
      {
        sub: String(user._id),
        email: user.email,
        type: "pw_reset",
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const baseUrl =
      process.env.PUBLIC_APP_URL || "https://membersvip.esteborg.live";

    const resetUrl = `${baseUrl}/#reset?token=${encodeURIComponent(resetToken)}`;

    // 🔥 Aquí deberías enviar email real (SendGrid, Resend, etc.)
    console.log("[PASSWORD RESET LINK]", resetUrl);

    return res.json({ ok: true });
  } catch (err) {
    console.error("forgot error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   RESET PASSWORD
   POST /api/auth/reset
===================================================== */

router.post("/auth/reset", async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ ok: false, error: "token_and_password_required" });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ ok: false, error: "password_too_short" });
    }

    if (!requireJwtSecret(res)) return;

    let payload;
    try {
      payload = jwt.verify(String(token), process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, error: "invalid_or_expired_token" });
    }

    if (payload?.type !== "pw_reset" || !payload?.sub) {
      return res.status(401).json({ ok: false, error: "invalid_token" });
    }

    const db = await getDb();
    const users = db.collection("users");

    const userId = new ObjectId(String(payload.sub));
    const passwordHash = await bcrypt.hash(String(password), 12);

    await users.updateOne(
      { _id: userId },
      { $set: { passwordHash, updatedAt: new Date() } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("reset error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;

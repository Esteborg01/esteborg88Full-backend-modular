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

function safeUA(req) {
  return String(req.headers["user-agent"] || "").slice(0, 300);
}

function safeIP(req) {
  // Render/Proxies: x-forwarded-for puede traer lista. Tomamos el primero.
  const xf = String(req.headers["x-forwarded-for"] || "");
  const ip = (xf.split(",")[0] || req.socket?.remoteAddress || "").trim();
  return ip.slice(0, 80);
}

function now() {
  return new Date();
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
      tokenVersion: 1, // 🔥 revocación global
      createdAt: now(),
      updatedAt: now(),
    });

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   LOGIN (crea sesión)
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
    const sessions = db.collection("sessions");

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) return res.status(401).json({ ok: false, error: "invalid_credentials" });

    const okPass = await bcrypt.compare(String(password), user.passwordHash);
    if (!okPass) return res.status(401).json({ ok: false, error: "invalid_credentials" });

    // ✅ crea sesión por dispositivo
    const sessionDoc = {
      userId: user._id,
      createdAt: now(),
      lastSeenAt: now(),
      revokedAt: null,
      ua: safeUA(req),
      ip: safeIP(req),
      label: String(req.body?.deviceLabel || "").slice(0, 80) || null,
    };

    const ins = await sessions.insertOne(sessionDoc);
    const sid = String(ins.insertedId);

    const token = jwt.sign(
      {
        sub: String(user._id),
        email: user.email,
        plan: user.plan,
        tv: user.tokenVersion || 1,
        sid, // 🔥 sesión actual
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
   ME (valida sesión + lastSeen)
===================================================== */

router.get("/auth/me", async (req, res) => {
  try {
    if (!requireJwtSecret(res)) return;

    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ ok: false, error: "missing_token" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, error: "invalid_token" });
    }

    const db = await getDb();
    const users = db.collection("users");
    const sessions = db.collection("sessions");

    const userId = payload?.sub;
    const sid = payload?.sid;

    if (!userId || !sid) return res.status(401).json({ ok: false, error: "invalid_token" });

    const user = await users.findOne({ _id: new ObjectId(String(userId)) });
    if (!user) return res.status(404).json({ ok: false, error: "user_not_found" });

    // ✅ tokenVersion check (revocación global)
    if ((payload.tv || 1) !== (user.tokenVersion || 1)) {
      return res.status(401).json({ ok: false, error: "token_revoked" });
    }

    // ✅ sesión activa check
    const sess = await sessions.findOne({
      _id: new ObjectId(String(sid)),
      userId: user._id,
      revokedAt: null,
    });

    if (!sess) return res.status(401).json({ ok: false, error: "session_revoked" });

    // ✅ actualiza lastSeen (sin atascar la DB si spamean)
    sessions.updateOne(
      { _id: sess._id },
      { $set: { lastSeenAt: now(), ip: safeIP(req) } }
    ).catch(() => {});

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
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   SESSIONS LIST (Netflix)
   GET /api/auth/sessions
===================================================== */

router.get("/auth/sessions", async (req, res) => {
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
    const sessions = db.collection("sessions");

    const user = await users.findOne({ _id: new ObjectId(String(payload.sub)) });
    if (!user) return res.status(404).json({ ok: false });

    if ((payload.tv || 1) !== (user.tokenVersion || 1)) {
      return res.status(401).json({ ok: false, error: "token_revoked" });
    }

    const list = await sessions
      .find({ userId: user._id, revokedAt: null })
      .sort({ lastSeenAt: -1 })
      .limit(25)
      .toArray();

    return res.json({
      ok: true,
      currentSid: String(payload.sid),
      sessions: list.map(s => ({
        id: String(s._id),
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        ua: s.ua,
        ip: s.ip,
        label: s.label,
      })),
    });
  } catch (err) {
    console.error("sessions error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   LOGOUT ONE SESSION
   POST /api/auth/logoutSession { sessionId }
===================================================== */

router.post("/auth/logoutSession", async (req, res) => {
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

    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ ok: false, error: "missing_sessionId" });

    const db = await getDb();
    const users = db.collection("users");
    const sessions = db.collection("sessions");

    const user = await users.findOne({ _id: new ObjectId(String(payload.sub)) });
    if (!user) return res.status(404).json({ ok: false });

    if ((payload.tv || 1) !== (user.tokenVersion || 1)) {
      return res.status(401).json({ ok: false, error: "token_revoked" });
    }

    await sessions.updateOne(
      { _id: new ObjectId(String(sessionId)), userId: user._id, revokedAt: null },
      { $set: { revokedAt: now() } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("logoutSession error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   LOGOUT ALL (revoca todo + tokenVersion++)
   POST /api/auth/logoutAll
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
    const sessions = db.collection("sessions");

    const userId = new ObjectId(String(payload.sub));

    await users.updateOne(
      { _id: userId },
      { $inc: { tokenVersion: 1 }, $set: { updatedAt: now() } }
    );

    // ✅ revoca sesiones activas también (más “Netflix”)
    await sessions.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: now() } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("logoutAll error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   FORGOT PASSWORD (manda link)
===================================================== */

router.post("/auth/forgot", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: "email_required" });
    if (!requireJwtSecret(res)) return;

    // 🔒 delay anti-enumeración
    await new Promise(r => setTimeout(r, 500));

    const db = await getDb();
    const users = db.collection("users");

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await users.findOne({ email: normalizedEmail });

    // ✅ siempre ok:true
    if (!user) return res.json({ ok: true });

    const resetToken = jwt.sign(
      { sub: String(user._id), type: "pw_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const baseUrl = process.env.PUBLIC_APP_URL || "https://membersvip.esteborg.live";
    const resetUrl = `${baseUrl}/#reset?token=${encodeURIComponent(resetToken)}`;

    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "Recupera tu acceso Esteborg VIP",
      html: `
        <div style="font-family:Inter,Arial;padding:30px;background:#0e1016;color:#f4f1e8">
          <h2 style="color:#d7b66a;margin:0 0 10px;">Recuperación de contraseña</h2>
          <p style="opacity:.9;margin:0 0 16px;">Haz clic para crear una nueva contraseña.</p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:14px 22px;background:#d7b66a;color:#101010;font-weight:800;border-radius:12px;text-decoration:none">
             Resetear contraseña
          </a>
          <p style="margin-top:18px;font-size:12px;opacity:.7">Este link expira en 15 minutos.</p>
        </div>
      `,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("forgot error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   RESET PASSWORD (cambia password + revoca sesiones)
===================================================== */

router.post("/auth/reset", async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password)
      return res.status(400).json({ ok: false, error: "token_and_password_required" });

    if (String(password).length < 8)
      return res.status(400).json({ ok: false, error: "password_too_short" });

    if (!requireJwtSecret(res)) return;

    let payload;
    try {
      payload = jwt.verify(String(token), process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, error: "invalid_or_expired_token" });
    }

    if (payload?.type !== "pw_reset" || !payload?.sub)
      return res.status(401).json({ ok: false, error: "invalid_token" });

    const db = await getDb();
    const users = db.collection("users");
    const sessions = db.collection("sessions");

    const userId = new ObjectId(String(payload.sub));
    const passwordHash = await bcrypt.hash(String(password), 12);

    await users.updateOne(
      { _id: userId },
      { $set: { passwordHash, updatedAt: now() }, $inc: { tokenVersion: 1 } }
    );

    // ✅ revoca todas las sesiones (porque ya cambió password)
    await sessions.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: now() } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("reset error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;

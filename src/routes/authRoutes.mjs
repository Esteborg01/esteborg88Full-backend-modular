// src/routes/authRoutes.mjs

import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoClient, ObjectId } from "mongodb";
import { Resend } from "resend";

const router = express.Router();

let client;
let db;

async function getDb() {
  if (db) return db;

  if (!process.env.MONGO_URI) {
    throw new Error("mongo_uri_missing");
  }

  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  db = client.db();

  console.log("✅ Mongo connected (authRoutes)");
  return db;
}

function getPublicAppUrl() {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://membersvip.esteborg.live"
  ).replace(/\/+$/, "");
}

function requireJwtSecret(res) {
  if (!process.env.JWT_SECRET) {
    res.status(500).json({ ok: false, error: "jwt_secret_missing" });
    return false;
  }
  return true;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sanitizeUser(user) {
  if (!user) return null;

  return {
    id: String(user._id),
    email: user.email || "",
    status: user.status || "inactive",
    vip: !!user.vip,
    plan: user.plan || null,
    modulesAllowed: Array.isArray(user.modulesAllowed) ? user.modulesAllowed : [],
    vipExpiresAt: user.vipExpiresAt || null,
    emailVerified: !!user.emailVerified,
    stripeCustomerId: user.stripeCustomerId || null,
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

function isExpired(isoDate) {
  if (!isoDate) return true;
  const t = Date.parse(isoDate);
  if (Number.isNaN(t)) return true;
  return Date.now() > t;
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      vip: !!user.vip,
      plan: user.plan || null,
      modulesAllowed: Array.isArray(user.modulesAllowed) ? user.modulesAllowed : [],
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/* =========================
POST /api/auth/login
========================= */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        ok: false,
        error: "missing_fields",
      });
    }

    if (!requireJwtSecret(res)) return;

    const database = await getDb();
    const users = database.collection("users");

    const user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: "user_not_found",
      });
    }

    if (!user.password) {
      return res.status(403).json({
        ok: false,
        error: "password_not_set",
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        ok: false,
        error: "invalid_password",
      });
    }

    if (!user.vip || user.status !== "active") {
      return res.status(403).json({
        ok: false,
        error: "vip_required",
      });
    }

    if (user.vipExpiresAt && isExpired(user.vipExpiresAt)) {
      return res.status(403).json({
        ok: false,
        error: "membership_expired",
      });
    }

    const token = signAccessToken(user);

    return res.json({
      ok: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("[LOGIN]", err);
    return res.status(500).json({
      ok: false,
      error: "login_failed",
    });
  }
});

/* =========================
GET /api/auth/me
========================= */
router.get("/auth/me", async (req, res) => {
  try {
    if (!requireJwtSecret(res)) return;

    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        error: "token_required",
      });
    }

    const token = auth.replace("Bearer ", "").trim();

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        ok: false,
        error: "invalid_token",
      });
    }

    const database = await getDb();
    const users = database.collection("users");

    const email = normalizeEmail(decoded.email);
    const user = await users.findOne({ email });

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "user_not_found",
      });
    }

    if (!user.vip || user.status !== "active") {
      return res.status(403).json({
        ok: false,
        error: "vip_required",
      });
    }

    if (user.vipExpiresAt && isExpired(user.vipExpiresAt)) {
      return res.status(403).json({
        ok: false,
        error: "membership_expired",
      });
    }

    return res.json({
      ok: true,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("[ME]", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

/* =========================
POST /api/auth/forgot
========================= */
router.post("/auth/forgot", async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        ok: false,
        error: "email_required",
      });
    }

    if (!requireJwtSecret(res)) return;

    if (!process.env.RESEND_API_KEY) {
      console.warn("[FORGOT] RESEND_API_KEY missing");
      return res.status(500).json({
        ok: false,
        error: "resend_api_key_missing",
      });
    }

    if (!process.env.EMAIL_FROM) {
      console.warn("[FORGOT] EMAIL_FROM missing");
      return res.status(500).json({
        ok: false,
        error: "email_from_missing",
      });
    }

    const database = await getDb();
    const users = database.collection("users");

    const user = await users.findOne({ email: normalizedEmail });

    console.log("[FORGOT] Request for:", normalizedEmail);

    if (!user) {
      console.warn("[FORGOT] user_not_found:", normalizedEmail);
      return res.status(404).json({
        ok: false,
        error: "user_not_found",
      });
    }

    const resetToken = jwt.sign(
      {
        sub: String(user._id),
        type: "pw_reset",
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const resetUrl = `${getPublicAppUrl()}/#reset?token=${encodeURIComponent(resetToken)}`;

    const resend = new Resend(process.env.RESEND_API_KEY);

    const resp = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: "Recupera tu acceso Esteborg VIP",
      html: `
        <div style="font-family:Inter,Arial,sans-serif;padding:24px;background:#0e1016;color:#f4f1e8">
          <h2 style="margin:0 0 12px;color:#d7b66a;">Recuperación de contraseña</h2>
          <p style="margin:0 0 16px;">Haz clic en el botón para crear una nueva contraseña.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:14px 22px;background:#d7b66a;color:#101010;text-decoration:none;border-radius:12px;font-weight:800;">
            Resetear contraseña
          </a>
          <p style="margin-top:16px;font-size:12px;opacity:.75;">Este link expira en 15 minutos.</p>
        </div>
      `,
    });

    console.log("[FORGOT] Resend response:", resp);

    if (!resp || resp.error) {
      console.error("[FORGOT] resend failed:", resp?.error || resp);
      return res.status(500).json({
        ok: false,
        error: "email_send_failed",
        details: resp?.error || null,
      });
    }

    return res.json({
      ok: true,
      message: "reset_email_sent",
    });
  } catch (err) {
    console.error("[FORGOT]", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

/* =========================
POST /api/auth/reset
========================= */
router.post("/auth/reset", async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({
        ok: false,
        error: "missing_fields",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        ok: false,
        error: "password_too_short",
      });
    }

    if (!requireJwtSecret(res)) return;

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        ok: false,
        error: "invalid_or_expired_token",
      });
    }

    if (decoded.type !== "pw_reset" || !decoded.sub) {
      return res.status(400).json({
        ok: false,
        error: "invalid_or_expired_token",
      });
    }

    const database = await getDb();
    const users = database.collection("users");

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(decoded.sub) },
      {
        $set: {
          password: hashedPassword,
          emailVerified: true,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    const user = result?.value || result;

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "user_not_found",
      });
    }

    let accessToken = null;

    if (user.vip && user.status === "active" && (!user.vipExpiresAt || !isExpired(user.vipExpiresAt))) {
      accessToken = signAccessToken(user);
    }

    return res.json({
      ok: true,
      message: "password_updated",
      token: accessToken,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("[RESET]", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
    });
  }
});

export default router;

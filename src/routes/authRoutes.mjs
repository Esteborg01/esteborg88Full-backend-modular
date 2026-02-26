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

function allowUnverifiedLogin() {
  return String(process.env.ESTEBORG_ALLOW_UNVERIFIED_LOGIN || "0") === "1";
}

function getPublicAppUrl() {
  return (process.env.PUBLIC_APP_URL || "https://membersvip.esteborg.live").replace(/\/+$/, "");
}

function getEmailFrom() {
  // asegúrate que exista en Render
  return process.env.EMAIL_FROM || "no-reply@esteborg.live";
}

async function delay(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

/* =====================================================
   REGISTER + SEND VERIFY EMAIL
===================================================== */

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, plan, modulesAllowed } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email_and_password_required" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ ok: false, error: "password_too_short" });
    }

    const db = await getDb();
    const users = db.collection("users");

    const normalizedEmail = String(email).toLowerCase().trim();

    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ ok: false, error: "email_already_exists" });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    // OJO: esto es tu lógica actual. Si quieres "sin plan" al registrar, lo ajustamos después.
    const safePlan = plan === "ia90" ? "ia90" : "vip30";
    const days = getVipDurationDays(safePlan);
    const vipExpiresAt = addDays(new Date(), days);

    const now = new Date();

    const insert = await users.insertOne({
      email: normalizedEmail,
      passwordHash,
      plan: safePlan,
      modulesAllowed: Array.isArray(modulesAllowed) ? modulesAllowed : [],
      vipExpiresAt,
      status: "active",
      createdAt: now,
      updatedAt: now,

      // ✅ NUEVO
      emailVerified: false,
      verifiedAt: null,
    });

    // ✅ manda correo de verificación
    if (!requireJwtSecret(res)) return;

    const verifyToken = jwt.sign(
      { sub: String(insert.insertedId), type: "email_verify" },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const verifyUrl = `${getPublicAppUrl()}/#verify?token=${encodeURIComponent(verifyToken)}`;

    try {
      await resend.emails.send({
        from: getEmailFrom(),
        to: normalizedEmail,
        subject: "Verifica tu email — Esteborg VIP",
        html: `
          <div style="font-family:Inter,Arial;padding:30px;background:#0b0d12;color:#f4f1e8">
            <h2 style="margin:0 0 10px;color:#d7b66a">Verificación de correo</h2>
            <p style="opacity:.9;line-height:1.5">
              Para activar tu acceso, verifica tu email dando clic aquí:
            </p>
            <a href="${verifyUrl}"
               style="display:inline-block;padding:14px 22px;
               background:#d7b66a;color:#101010;
               font-weight:800;border-radius:14px;
               text-decoration:none;margin-top:14px">
               Verificar correo
            </a>
            <p style="margin-top:18px;font-size:12px;opacity:.7">
              Este link expira en 24 horas.
            </p>
          </div>
        `,
      });
    } catch (e) {
      // No tumbes registro si falla el mail (pero sí loggea)
      console.error("verify email send failed:", e);
    }

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   VERIFY EMAIL
===================================================== */

router.post("/auth/verify", async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ ok: false, error: "token_required" });
    if (!requireJwtSecret(res)) return;

    let payload;
    try {
      payload = jwt.verify(String(token), process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, error: "invalid_or_expired_token" });
    }

    if (payload?.type !== "email_verify" || !payload?.sub) {
      return res.status(401).json({ ok: false, error: "invalid_token" });
    }

    const db = await getDb();
    const users = db.collection("users");

    await users.updateOne(
      { _id: new ObjectId(String(payload.sub)) },
      { $set: { emailVerified: true, verifiedAt: new Date(), updatedAt: new Date() } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("verify error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   RESEND VERIFY (opcional pero MUY recomendado)
===================================================== */

router.post("/auth/resend-verify", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: "email_required" });
    if (!requireJwtSecret(res)) return;

    // 🔒 anti-enumeración / timing
    await delay(500);

    const db = await getDb();
    const users = db.collection("users");

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await users.findOne({ email: normalizedEmail });

    // Siempre ok
    if (!user) return res.json({ ok: true });

    // Si ya está verificado, igual ok
    if (user.emailVerified) return res.json({ ok: true });
    
     if (user.emailVerified === false) {
  return res.status(403).json({ ok:false, error:"email_not_verified" });
}

    const verifyToken = jwt.sign(
      { sub: String(user._id), type: "email_verify" },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const verifyUrl = `${getPublicAppUrl()}/#verify?token=${encodeURIComponent(verifyToken)}`;

    await resend.emails.send({
      from: getEmailFrom(),
      to: user.email,
      subject: "Tu link de verificación — Esteborg VIP",
      html: `
        <div style="font-family:Inter,Arial;padding:30px;background:#0b0d12;color:#f4f1e8">
          <h2 style="margin:0 0 10px;color:#d7b66a">Verifica tu correo</h2>
          <p style="opacity:.9;line-height:1.5">Aquí está tu link:</p>
          <a href="${verifyUrl}"
             style="display:inline-block;padding:14px 22px;
             background:#d7b66a;color:#101010;
             font-weight:800;border-radius:14px;
             text-decoration:none;margin-top:14px">
             Verificar correo
          </a>
          <p style="margin-top:18px;font-size:12px;opacity:.7">Expira en 24 horas.</p>
        </div>
      `,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("resend-verify error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   LOGIN (bloquea si no está verificado)
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

    // ✅ NUEVO: Bloqueo por verificación (feature flag)
    if (!allowUnverifiedLogin() && !user.emailVerified) {
      return res.status(403).json({ ok: false, error: "email_not_verified" });
    }

    const okPass = await bcrypt.compare(String(password), user.passwordHash);
    if (!okPass) return res.status(401).json({ ok: false, error: "invalid_credentials" });

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
        emailVerified: !!user.emailVerified,
      },
    });
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
    if (!token) return res.status(401).json({ ok: false, error: "missing_token" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, error: "invalid_token" });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({
      _id: new ObjectId(String(payload.sub)),
    });

    if (!user) return res.status(404).json({ ok: false, error: "user_not_found" });

    return res.json({
      ok: true,
      user: {
        email: user.email,
        plan: user.plan,
        vipExpiresAt: user.vipExpiresAt,
        status: user.status,
        emailVerified: !!user.emailVerified,
      },
    });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =====================================================
   FORGOT PASSWORD
===================================================== */

router.post("/auth/forgot", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: "email_required" });
    if (!requireJwtSecret(res)) return;

    // 🔒 Pequeño delay anti-ataque
    await delay(500);

    const db = await getDb();
    const users = db.collection("users");

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await users.findOne({ email: normalizedEmail });

    // Siempre ok
    if (!user) return res.json({ ok: true });

    const resetToken = jwt.sign(
      { sub: String(user._id), type: "pw_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const resetUrl = `${getPublicAppUrl()}/#reset?token=${encodeURIComponent(resetToken)}`;

    await resend.emails.send({
      from: getEmailFrom(),
      to: user.email,
      subject: "Recupera tu acceso — Esteborg VIP",
      html: `
        <div style="font-family:Inter,Arial;padding:30px;background:#0e1016;color:#f4f1e8">
          <h2 style="color:#d7b66a;margin:0 0 10px;">Recuperación de contraseña</h2>
          <p>Haz clic para crear una nueva contraseña:</p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:14px 22px;
             background:#d7b66a;color:#101010;
             font-weight:800;border-radius:12px;
             text-decoration:none;margin-top:14px">
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
   RESET PASSWORD
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

    const passwordHash = await bcrypt.hash(String(password), 12);

    await users.updateOne(
      { _id: new ObjectId(String(payload.sub)) },
      { $set: { passwordHash, updatedAt: new Date() } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("reset error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;

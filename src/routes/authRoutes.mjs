// src/routes/authRoutes.mjs
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { Resend } from "resend";

import { getDb } from "../config/mongoClient.mjs";

const router = express.Router();

const resend = new Resend(process.env.RESEND_API_KEY);

/* =========================
   Helpers
========================= */
function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

function ensureJwt(res) {
  if (!process.env.JWT_SECRET) {
    res.status(500).json({ ok: false, error: "jwt_secret_missing" });
    return false;
  }
  return true;
}

function getPublicAppUrl() {
  return process.env.PUBLIC_APP_URL || "https://membersvip.esteborg.live";
}

function safeEmail(e) {
  const s = String(e || "");
  const at = s.indexOf("@");
  if (at <= 1) return "***";
  return s.slice(0, 2) + "***" + s.slice(at);
}

// Resend a veces regresa objetos raros; esto intenta dejarlo serializable
function toPlainErr(err) {
  try {
    return {
      name: err?.name,
      message: err?.message,
      code: err?.code,
      statusCode: err?.statusCode,
      response: err?.response,
      data: err?.data,
      stack: err?.stack,
    };
  } catch {
    return { message: String(err) };
  }
}

/* =========================
   REGISTER (apagado)
========================= */
router.post("/auth/register", async (req, res) => {
  return res.status(403).json({
    ok: false,
    error: "registration_disabled",
    message: "No hay registro público. El acceso se activa con tu compra.",
  });
});

/* =========================
   LOGIN
========================= */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email_and_password_required" });
    }
    if (!ensureJwt(res)) return;

    const db = await getDb();
    const users = db.collection("users");

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) return res.status(401).json({ ok: false, error: "invalid_credentials" });

    // Usuario creado por Stripe sin password aún
    if (!user.passwordHash) {
      return res.status(403).json({
        ok: false,
        error: "password_not_set",
        message: "Tu acceso fue activado por compra. Crea tu password en “¿Olvidaste tu password?”",
      });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ ok: false, error: "invalid_credentials" });

    if (user.emailVerified === false) {
      return res.status(403).json({ ok: false, error: "email_not_verified" });
    }

    const token = jwt.sign(
      { sub: String(user._id), email: user.email, plan: user.plan },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({ ok: true, token });
  } catch (err) {
    console.error("❌ login error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =========================
   ME (incluye modulesAllowed)
========================= */
router.get("/auth/me", async (req, res) => {
  try {
    if (!ensureJwt(res)) return;

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

    const user = await users.findOne({ _id: new ObjectId(String(payload.sub)) });
    if (!user) return res.status(404).json({ ok: false });

    return res.json({
      ok: true,
      user: {
        email: user.email,
        plan: user.plan,
        vipExpiresAt: user.vipExpiresAt,
        modulesAllowed: Array.isArray(user.modulesAllowed) ? user.modulesAllowed : [],
        emailVerified: user.emailVerified === true,
        status: user.status || "active",
      },
    });
  } catch (err) {
    console.error("❌ me error:", err);
    return res.status(500).json({ ok: false });
  }
});

/* =========================
   FORGOT  ✅ PARCHE RESEND
========================= */
router.post("/auth/forgot", async (req, res) => {
  const startedAt = Date.now();
  const reqId = Math.random().toString(16).slice(2, 10);

  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: "email_required" });
    if (!ensureJwt(res)) return;

    const normalizedEmail = String(email).toLowerCase().trim();

    // ✅ Log útil (sin filtrar datos peligrosos)
    console.log(`[FORGOT ${reqId}] requested for:`, safeEmail(normalizedEmail));
    console.log(`[FORGOT ${reqId}] ENV has RESEND_API_KEY:`, !!process.env.RESEND_API_KEY);
    console.log(`[FORGOT ${reqId}] ENV EMAIL_FROM:`, process.env.EMAIL_FROM || "(missing)");

    // “Siempre ok” para no filtrar existencia de cuentas
    // pero primero revisamos si el user existe (si no, terminamos)
    const db = await getDb();
    const users = db.collection("users");
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      console.log(`[FORGOT ${reqId}] user not found (return ok).`);
      return res.json({ ok: true });
    }

    // Si no está configurado Resend, no tronamos
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      console.warn(`[FORGOT ${reqId}] resend/email_from missing -> return ok`);
      return res.json({ ok: true });
    }

    // Token reset 15 min
    const resetToken = jwt.sign(
      { sub: String(user._id), type: "pw_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const resetUrl = `${getPublicAppUrl()}/#reset?token=${encodeURIComponent(resetToken)}`;

    const html = `
      <div style="font-family:Inter,Arial;padding:30px;background:#0e1016;color:#f4f1e8">
        <h2 style="color:#d7b66a;margin:0 0 10px">Crea / recupera tu contraseña</h2>
        <p style="opacity:.9;margin:0 0 14px">Haz clic para crear una nueva contraseña.</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:14px 22px;background:#d7b66a;color:#101010;
           font-weight:800;border-radius:12px;text-decoration:none;margin-top:6px">
           Crear nueva contraseña
        </a>
        <p style="margin-top:18px;font-size:12px;opacity:.7">Este link expira en 15 minutos.</p>
      </div>
    `;

    // ✅ PARCHE: log + captura respuesta/errores reales
    try {
      const resp = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Recupera tu acceso Esteborg VIP",
        html,
      });

      console.log(`[FORGOT ${reqId}] RESEND response:`, resp);
    } catch (e) {
      const plain = toPlainErr(e);
      console.error(`[FORGOT ${reqId}] ❌ RESEND failed:`, plain);

      // 🔥 Si quieres ver el error en el front SOLO mientras debuggeas, descomenta:
      // return res.status(500).json({ ok:false, error:"resend_failed", detail: plain });

      // En prod, mejor “ok” para no dar pistas
      return res.json({ ok: true });
    }

    console.log(`[FORGOT ${reqId}] done in ${Date.now() - startedAt}ms`);
    return res.json({ ok: true });
  } catch (err) {
    console.error(`[FORGOT] ❌ internal error:`, toPlainErr(err));
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =========================
   RESET PASSWORD
========================= */
router.post("/auth/reset", async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ ok: false, error: "token_and_password_required" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ ok: false, error: "password_too_short" });
    }
    if (!ensureJwt(res)) return;

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
      {
        $set: {
          passwordHash,
          emailVerified: true,
          updatedAt: new Date(),
        },
      }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ reset error:", toPlainErr(err));
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =========================
   RESEND VERIFY
========================= */
router.post("/auth/resend-verify", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: "email_required" });
    if (!ensureJwt(res)) return;

    const normalizedEmail = String(email).toLowerCase().trim();

    const db = await getDb();
    const users = db.collection("users");
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) return res.json({ ok: true });
    if (user.emailVerified === true) return res.json({ ok: true });

    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return res.json({ ok: true });

    const verifyToken = jwt.sign(
      { sub: String(user._id), type: "verify_email" },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    const verifyUrl = `${getPublicAppUrl()}/#reset?token=${encodeURIComponent(verifyToken)}`;

    try {
      const resp = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Verifica tu correo - Esteborg VIP",
        html: `
          <div style="font-family:Inter,Arial;padding:30px;background:#0e1016;color:#f4f1e8">
            <h2 style="color:#d7b66a;margin:0 0 10px">Verifica tu correo</h2>
            <p style="opacity:.9;margin:0 0 14px">Confirma tu correo para poder iniciar sesión.</p>
            <a href="${verifyUrl}" style="display:inline-block;padding:14px 22px;background:#d7b66a;color:#101010;font-weight:800;border-radius:12px;text-decoration:none;margin-top:6px">
              Verificar correo
            </a>
            <p style="margin-top:18px;font-size:12px;opacity:.7">Este link expira en 30 minutos.</p>
          </div>
        `,
      });
      console.log("[RESEND-VERIFY] RESEND response:", resp);
    } catch (e) {
      console.error("[RESEND-VERIFY] RESEND failed:", toPlainErr(e));
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ resend-verify error:", toPlainErr(err));
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =========================
   VERIFY EMAIL
========================= */
router.post("/auth/verify", async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ ok: false, error: "token_required" });
    if (!ensureJwt(res)) return;

    let payload;
    try {
      payload = jwt.verify(String(token), process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, error: "invalid_or_expired_token" });
    }

    if (payload?.type !== "verify_email" || !payload?.sub) {
      return res.status(401).json({ ok: false, error: "invalid_token" });
    }

    const db = await getDb();
    const users = db.collection("users");

    await users.updateOne(
      { _id: new ObjectId(String(payload.sub)) },
      { $set: { emailVerified: true, updatedAt: new Date() } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ verify error:", toPlainErr(err));
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;

// src/routes/authRoutes.mjs
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend";
import { getMongoClient } from "../config/mongoClient.mjs";

const router = express.Router();

/**
 * ENV requeridas:
 * - JWT_SECRET
 * - MONGO_URI
 * - RESEND_API_KEY
 * - EMAIL_FROM            (ej: "Esteborg <soporte@mail.esteborg.live>")
 *
 * Opcionales:
 * - FRONTEND_BASE_URL     (default: https://membersvip.esteborg.live)
 */

function frontendBase() {
  return (process.env.FRONTEND_BASE_URL || "https://membersvip.esteborg.live").replace(/\/+$/, "");
}

function nowPlusMinutes(min) {
  return new Date(Date.now() + min * 60 * 1000);
}

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function safeEmail(s) {
  return String(s || "").trim().toLowerCase();
}

function isExpired(vipExpiresAt) {
  if (!vipExpiresAt) return true;
  const d = vipExpiresAt instanceof Date ? vipExpiresAt : new Date(vipExpiresAt);
  return Number.isNaN(d.getTime()) ? true : d.getTime() < Date.now();
}

async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) {
    console.warn("[EMAIL] RESEND_API_KEY missing. Skipping send.");
    return { skipped: true, reason: "missing_resend_api_key" };
  }
  if (!from) {
    console.warn("[EMAIL] EMAIL_FROM missing. Skipping send.");
    return { skipped: true, reason: "missing_email_from" };
  }

  const resend = new Resend(apiKey);
  const res = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });

  return res;
}

function signJwt(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is missing");

  const payload = {
    sub: String(user._id),
    email: user.email,
    plan: user.plan || null,
    modulesAllowed: Array.isArray(user.modulesAllowed) ? user.modulesAllowed : [],
    vipExpiresAt: user.vipExpiresAt || null,
    status: user.status || "active",
  };

  // 30 días de validez del JWT; el “acceso real” lo manda vipExpiresAt en el front
  return jwt.sign(payload, secret, { expiresIn: "30d" });
}

/**
 * POST /api/auth/login
 * body: { email, password }
 */
router.post("/auth/login", async (req, res) => {
  try {
    const email = safeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "missing_email_or_password" });
    }

    const client = await getMongoClient();
    const db = client.db();
    const users = db.collection("users");

    const user = await users.findOne({ email });

    // Respuesta genérica para no filtrar existencia
    if (!user) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    // Si el usuario lo creó Stripe y todavía no tiene password
    if (!user.passwordHash) {
      return res.status(409).json({
        ok: false,
        error: "password_not_set",
        message: "Tu cuenta existe pero aún no tiene password. Usa 'Olvidé mi password' para crearlo.",
      });
    }

    // Si quieres forzar verificación, deja esto. Si NO, comenta este bloque.
    if (user.emailVerified === false) {
      return res.status(403).json({
        ok: false,
        error: "email_not_verified",
        message: "Tu correo no está verificado. Revisa tu email para confirmar.",
      });
    }

    if (user.status && user.status !== "active") {
      return res.status(403).json({ ok: false, error: "inactive_user" });
    }

    // VIP expirado -> sin acceso
    if (isExpired(user.vipExpiresAt)) {
      return res.status(403).json({
        ok: false,
        error: "vip_expired",
        message: "Tu acceso expiró. Compra/renueva tu plan para volver a entrar.",
        vipExpiresAt: user.vipExpiresAt || null,
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    const token = signJwt(user);

    return res.json({
      ok: true,
      token,
      user: {
        email: user.email,
        plan: user.plan || null,
        modulesAllowed: user.modulesAllowed || [],
        vipExpiresAt: user.vipExpiresAt || null,
        status: user.status || "active",
        emailVerified: user.emailVerified !== false,
      },
    });
  } catch (err) {
    console.error("[LOGIN] error:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

/**
 * POST /api/auth/forgot
 * body: { email }
 * Siempre responde 200 para evitar enumeración.
 */
router.post("/auth/forgot", async (req, res) => {
  try {
    const email = safeEmail(req.body?.email);
    console.log("[FORGOT] Request for:", email);

    if (!email) {
      return res.status(200).json({ ok: true, message: "Si existe tu cuenta, te mandamos un link." });
    }

    const client = await getMongoClient();
    const db = client.db();
    const users = db.collection("users");

    const user = await users.findOne({ email });

    // Siempre 200, aunque no exista
    if (!user) {
      return res.status(200).json({ ok: true, message: "Si existe tu cuenta, te mandamos un link." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          resetTokenHash: tokenHash,
          resetTokenExpiresAt: nowPlusMinutes(30), // 30 min
          updatedAt: new Date(),
        },
      }
    );

    const resetUrl = `${frontendBase()}/#reset?token=${rawToken}`;

    const subject = "Esteborg • Recuperación de acceso";
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Recuperación de acceso</h2>
        <p>Alguien pidió resetear tu password.</p>
        <p><a href="${resetUrl}">Crea tu nuevo password aquí</a></p>
        <p style="color:#666;font-size:12px">Este link expira en 30 minutos.</p>
      </div>
    `;
    const text = `Recuperación de acceso: ${resetUrl} (expira en 30 minutos)`;

    const resendResp = await sendEmail({ to: email, subject, html, text });
    console.log("[FORGOT] Resend response:", resendResp);

    return res.status(200).json({ ok: true, message: "Si existe tu cuenta, te mandamos un link." });
  } catch (err) {
    console.error("[FORGOT] error:", err);
    // Aún así regresamos 200 para no filtrar ni romper UX
    return res.status(200).json({ ok: true, message: "Si existe tu cuenta, te mandamos un link." });
  }
});

/**
 * POST /api/auth/reset
 * body: { token, newPassword }
 */
router.post("/auth/reset", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!token || newPassword.length < 8) {
      return res.status(400).json({ ok: false, error: "invalid_payload" });
    }

    const client = await getMongoClient();
    const db = client.db();
    const users = db.collection("users");

    const tokenHash = sha256(token);

    const user = await users.findOne({
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ ok: false, error: "invalid_or_expired_token" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash,
          // ya que pudo cambiar password, lo consideramos verificado (opcional)
          emailVerified: user.emailVerified !== false ? user.emailVerified : true,
          status: user.status || "active",
          updatedAt: new Date(),
        },
        $unset: {
          resetTokenHash: "",
          resetTokenExpiresAt: "",
        },
      }
    );

    // Email de confirmación (best effort: si falla NO rompe reset)
    try {
      const subject = "Esteborg • Password cambiado";
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Password actualizado ✅</h2>
          <p>Tu contraseña se cambió correctamente.</p>
          <p>Si tú NO hiciste este cambio, contáctanos de inmediato.</p>
        </div>
      `;
      const text = "Tu contraseña se cambió correctamente. Si tú NO hiciste este cambio, contáctanos de inmediato.";
      const resp = await sendEmail({ to: user.email, subject, html, text });
      console.log("[RESET] confirmation email:", resp);
    } catch (e) {
      console.warn("[RESET] confirmation email failed:", e?.message || e);
    }

    return res.json({ ok: true, message: "Password actualizado. Ya puedes iniciar sesión." });
  } catch (err) {
    console.error("[RESET] error:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

/**
 * POST /api/auth/send-verify
 * body: { email }
 * Manda correo para verificar email (opcional).
 */
router.post("/auth/send-verify", async (req, res) => {
  try {
    const email = safeEmail(req.body?.email);
    if (!email) return res.status(400).json({ ok: false, error: "missing_email" });

    const client = await getMongoClient();
    const db = client.db();
    const users = db.collection("users");

    const user = await users.findOne({ email });
    if (!user) return res.status(200).json({ ok: true });

    const rawToken = crypto.randomBytes(24).toString("hex");
    const verifyHash = sha256(rawToken);

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          verifyTokenHash: verifyHash,
          verifyTokenExpiresAt: nowPlusMinutes(60),
          updatedAt: new Date(),
        },
      }
    );

    const verifyUrl = `${frontendBase()}/#verify?token=${rawToken}`;

    const subject = "Esteborg • Verifica tu correo";
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Verificación de correo</h2>
        <p>Confirma tu email aquí:</p>
        <p><a href="${verifyUrl}">Verificar mi correo</a></p>
        <p style="color:#666;font-size:12px">Este link expira en 60 minutos.</p>
      </div>
    `;
    const text = `Verifica tu correo: ${verifyUrl} (expira en 60 minutos)`;

    const resp = await sendEmail({ to: email, subject, html, text });
    console.log("[VERIFY] email resp:", resp);

    return res.json({ ok: true });
  } catch (err) {
    console.error("[SEND-VERIFY] error:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

/**
 * GET /api/auth/verify-email?token=...
 */
router.get("/auth/verify-email", async (req, res) => {
  try {
    const token = String(req.query?.token || "").trim();
    if (!token) return res.status(400).json({ ok: false, error: "missing_token" });

    const client = await getMongoClient();
    const db = client.db();
    const users = db.collection("users");

    const tokenHash = sha256(token);

    const user = await users.findOne({
      verifyTokenHash: tokenHash,
      verifyTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ ok: false, error: "invalid_or_expired_token" });

    await users.updateOne(
      { _id: user._id },
      {
        $set: { emailVerified: true, updatedAt: new Date() },
        $unset: { verifyTokenHash: "", verifyTokenExpiresAt: "" },
      }
    );

    return res.json({ ok: true, message: "Correo verificado. Ya puedes iniciar sesión." });
  } catch (err) {
    console.error("[VERIFY-EMAIL] error:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

export default router;

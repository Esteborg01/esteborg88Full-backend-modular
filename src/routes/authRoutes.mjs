import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ObjectId } from "mongodb";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const APP_BASE_URL = process.env.APP_BASE_URL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

// =============================
// HELPERS
// =============================

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: EMAIL_FROM, // 👈 IMPORTANTE: "Soporte Esteborg <soporte@esteborg.live>"
      to,
      subject,
      html
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "email_send_failed");
  }

  return data;
}

// =============================
// LOGIN
// =============================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "missing_fields" });
    }

    const users = req.app.locals.db.collection("users");

    const user = await users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }

    const storedHash = user.passwordHash || user.password || null;

    if (!storedHash) {
      return res.status(403).json({
        ok: false,
        error: "password_not_set"
      });
    }

    const valid = await bcrypt.compare(password, storedHash);

    if (!valid) {
      return res.status(401).json({
        ok: false,
        error: "invalid_credentials"
      });
    }

    const token = signToken(user);

    return res.json({
      ok: true,
      token
    });

  } catch (err) {
    console.error("[LOGIN ERROR]", err);
    return res.status(500).json({ ok: false, error: "internal_server_error" });
  }
});

// =============================
// FORGOT PASSWORD
// =============================

router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ ok: false, error: "missing_email" });
    }

    const users = req.app.locals.db.collection("users");

    const user = await users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }

    const token = generateResetToken();

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          resetToken: token,
          resetTokenExpires: Date.now() + 1000 * 60 * 30 // 30 min
        }
      }
    );

    const resetLink = `${APP_BASE_URL}/#reset?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Recupera tu acceso a Esteborg",
      html: `
        <h2>Recuperar acceso</h2>
        <p>Haz clic aquí para crear un nuevo password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Este link expira en 30 minutos.</p>
      `
    });

    return res.json({
      ok: true,
      message: "reset_email_sent"
    });

  } catch (err) {
    console.error("[FORGOT ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: "email_send_failed",
      details: err.message
    });
  }
});

// =============================
// RESET PASSWORD
// =============================

router.post("/reset", async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({
        ok: false,
        error: "missing_fields"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        ok: false,
        error: "password_too_short"
      });
    }

    const users = req.app.locals.db.collection("users");

    const user = await users.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        ok: false,
        error: "invalid_or_expired_token"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: hashedPassword,
          password: hashedPassword,
          updatedAt: new Date()
        },
        $unset: {
          resetToken: "",
          resetTokenExpires: ""
        }
      }
    );

    const newToken = signToken(user);

    return res.json({
      ok: true,
      token: newToken
    });

  } catch (err) {
    console.error("[RESET ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: "internal_server_error"
    });
  }
});

// =============================
// ME (para validar sesión)
// =============================

router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ ok: false, error: "no_token" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const users = req.app.locals.db.collection("users");

    const user = await users.findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }

    return res.json({
      ok: true,
      user: {
        email: user.email,
        modulesAllowed: user.modulesAllowed || [],
        vipExpiresAt: user.vipExpiresAt || null
      }
    });

  } catch (err) {
    return res.status(401).json({ ok: false, error: "invalid_token" });
  }
});

export default router;

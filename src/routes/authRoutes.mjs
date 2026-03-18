import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

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
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html
    })
  });

  const data = await r.json().catch(() => ({}));
  console.log("[RESEND]", data);

  if (!r.ok) throw new Error("email_error");
}

// =============================
// LOGIN
// =============================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = req.app.locals.db.collection("users");

    const user = await users.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(404).json({ error: "user_not_found" });

    const hash = user.passwordHash || user.password;

    if (!hash) return res.status(403).json({ error: "password_not_set" });

    const valid = await bcrypt.compare(password, hash);

    if (!valid) return res.status(401).json({ error: "invalid_credentials" });

    const token = signToken(user);

    res.json({ ok: true, token });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});

// =============================
// FORGOT
// =============================

router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body;
    const users = req.app.locals.db.collection("users");

    const user = await users.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(404).json({ error: "user_not_found" });

    const token = generateResetToken();

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          resetToken: token,
          resetTokenExpires: Date.now() + 1000 * 60 * 30
        }
      }
    );

    const link = `${APP_BASE_URL}/#reset?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Recupera tu acceso",
      html: `<a href="${link}">Reset password</a>`
    });

    res.json({ ok: true });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "forgot_error" });
  }
});

// =============================
// RESET
// =============================

router.post("/reset", async (req, res) => {
  try {
    const { token, password } = req.body;
    const users = req.app.locals.db.collection("users");

    const user = await users.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: "invalid_token" });

    const hash = await bcrypt.hash(password, 10);

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: hash,
          password: hash
        },
        $unset: {
          resetToken: "",
          resetTokenExpires: ""
        }
      }
    );

    const newToken = signToken(user);

    res.json({ ok: true, token: newToken });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "reset_error" });
  }
});

export default router;

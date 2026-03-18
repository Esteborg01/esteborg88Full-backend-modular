import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend";
import { ObjectId } from "mongodb";

const router = express.Router();

const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET;
const APP_URL = process.env.APP_URL;

// ==============================
// HELPERS
// ==============================

function usersCollection(req) {
  return req.app.locals.db.collection("users");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getModules(user) {
  if (Array.isArray(user.modulesAllowed)) return user.modulesAllowed;
  if (Array.isArray(user.modules)) return user.modules;
  return [];
}

function getPlan(user) {
  return user.plan || "free";
}

function getVipExpiresAt(user) {
  return user.vipExpiresAt || null;
}

function signAccessToken(user) {
  return jwt.sign(
    {
      uid: String(user._id),
      email: user.email,
      modules: getModules(user),
      plan: getPlan(user)
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function parseTokenFromRequest(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }

  if (req.query?.token) {
    return String(req.query.token).trim();
  }

  return null;
}

async function sendResetEmail({ email, resetLink }) {
  const response = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Recuperación de contraseña",
    html: `
      <div style="background:#0b0b0f;padding:40px;font-family:Arial,sans-serif;color:#ffffff">
        <h2 style="color:#d4af37;margin:0 0 20px 0;">Recuperación de contraseña</h2>
        <p style="font-size:16px;line-height:1.5;margin:0 0 20px 0;">
          Haz clic en el botón para crear una nueva contraseña.
        </p>

        <a href="${resetLink}"
           style="display:inline-block;margin-top:12px;padding:14px 24px;
                  background:#d4af37;color:#000000;border-radius:10px;
                  text-decoration:none;font-weight:bold;">
          Resetear contraseña
        </a>

        <p style="margin-top:24px;color:#aaaaaa;font-size:14px;">
          Este link expira en 15 minutos.
        </p>
      </div>
    `
  });

  console.log("📨 RESET EMAIL RESPONSE:", response);

  if (response?.error) {
    throw new Error(`resend_error:${JSON.stringify(response.error)}`);
  }

  return response;
}

async function sendPasswordChangedEmail({ email }) {
  const response = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Tu contraseña fue modificada",
    html: `
      <div style="background:#0b0b0f;padding:40px;font-family:Arial,sans-serif;color:#ffffff">
        <h2 style="color:#d4af37;margin:0 0 20px 0;">Cambio de contraseña</h2>
        <p style="font-size:16px;line-height:1.5;margin:0 0 14px 0;">
          Te avisamos que la contraseña de tu cuenta Esteborg VIP se modificó exitosamente.
        </p>
        <p style="font-size:15px;line-height:1.5;color:#cccccc;margin:0 0 14px 0;">
          Si fuiste tú, no necesitas hacer nada.
        </p>
        <p style="font-size:15px;line-height:1.5;color:#cccccc;margin:0;">
          Si no reconoces este cambio, entra de inmediato a recuperar tu acceso.
        </p>
      </div>
    `
  });

  console.log("📨 PASSWORD CHANGED EMAIL RESPONSE:", response);

  if (response?.error) {
    throw new Error(`password_changed_email_error:${JSON.stringify(response.error)}`);
  }

  return response;
}

// ==============================
// LOGIN
// ==============================

router.post("/login", async (req, res) => {
  try {
    const users = usersCollection(req);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: "missing_fields"
      });
    }

    const user = await users.findOne({
      email: { $regex: new RegExp(`^${email}$`, "i") }
    });

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: "invalid_credentials"
      });
    }

    const hash = user.passwordHash || user.password || null;

    if (!hash) {
      return res.status(403).json({
        ok: false,
        error: "password_not_set"
      });
    }

    const valid = await bcrypt.compare(password, hash);

    if (!valid) {
      return res.status(401).json({
        ok: false,
        error: "invalid_credentials"
      });
    }

    const token = signAccessToken(user);

    return res.json({
      ok: true,
      token,
      user: {
        email: user.email,
        plan: getPlan(user),
        modules: getModules(user),
        vipExpiresAt: getVipExpiresAt(user)
      }
    });
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "server_error"
    });
  }
});

// ==============================
// ME
// ==============================

router.get("/me", async (req, res) => {
  try {
    const token = parseTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "missing_token"
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const users = usersCollection(req);

    const user = await users.findOne({ _id: new ObjectId(decoded.uid) });

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "user_not_found"
      });
    }

    return res.json({
      ok: true,
      user: {
        email: user.email,
        plan: getPlan(user),
        modulesAllowed: getModules(user),
        vipExpiresAt: getVipExpiresAt(user),
        status: user.status || null,
        emailVerified: !!user.emailVerified
      }
    });
  } catch (err) {
    console.error("❌ ME ERROR:", err);
    return res.status(401).json({
      ok: false,
      error: "invalid_token"
    });
  }
});

// ==============================
// FORGOT / FIRST PASSWORD SETUP
// ==============================

router.post("/forgot", async (req, res) => {
  try {
    const users = usersCollection(req);
    const email = normalizeEmail(req.body?.email);

    console.log("[FORGOT] Request for:", email);

    if (!email) {
      return res.status(400).json({
        ok: false,
        error: "missing_email"
      });
    }

    const user = await users.findOne({
      email: { $regex: new RegExp(`^${email}$`, "i") }
    });

    if (!user) {
      console.log("❌ USER NOT FOUND:", email);
      return res.json({ ok: true });
    }

    if (!APP_URL) {
      console.error("❌ APP_URL no definido");
      return res.status(500).json({
        ok: false,
        error: "missing_app_url"
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = Date.now() + 1000 * 60 * 15;

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          resetToken,
          resetTokenExpires,
          updatedAt: new Date()
        }
      }
    );

    const resetLink = `${APP_URL}/?token=${resetToken}#reset`;

    await sendResetEmail({ email, resetLink });

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ FORGOT ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "forgot_error"
    });
  }
});

// ==============================
// RESET / SET PASSWORD + AUTOLOGIN
// ==============================

router.post("/reset", async (req, res) => {
  try {
    const users = usersCollection(req);
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");

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

    const user = await users.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        ok: false,
        error: "invalid_token"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: hash,
          password: hash,
          updatedAt: new Date()
        },
        $unset: {
          resetToken: "",
          resetTokenExpires: ""
        }
      }
    );

    try {
      await sendPasswordChangedEmail({ email: user.email });
    } catch (mailErr) {
      console.error("❌ PASSWORD CHANGED EMAIL ERROR:", mailErr);
    }

    const freshUser = await users.findOne({ _id: user._id });
    const accessToken = signAccessToken(freshUser);

    return res.json({
      ok: true,
      token: accessToken,
      user: {
        email: freshUser.email,
        plan: getPlan(freshUser),
        modules: getModules(freshUser),
        vipExpiresAt: getVipExpiresAt(freshUser)
      }
    });
  } catch (err) {
    console.error("❌ RESET ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "reset_error"
    });
  }
});

// ==============================
// POST-PAGO -> RESOLVE RESET TOKEN
// ==============================
router.get("/resolve-checkout", async (req, res) => {
  try {
    const checkoutToken = String(req.query?.ct || "").trim();

    if (!checkoutToken) {
      return res.status(400).json({
        ok: false,
        error: "missing_checkout_token"
      });
    }

    const checkoutLinks = req.app.locals.db.collection("checkout_links");

    const link = await checkoutLinks.findOne({ checkoutToken });

    if (!link) {
      return res.status(404).json({
        ok: false,
        error: "checkout_token_not_found"
      });
    }

    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        ok: false,
        error: "checkout_token_expired"
      });
    }

    return res.json({
      ok: true,
      resetToken: link.resetToken
    });
  } catch (err) {
    console.error("❌ RESOLVE CHECKOUT ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "resolve_checkout_error"
    });
  }
});

export default router;

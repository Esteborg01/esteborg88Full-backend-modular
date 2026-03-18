import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend";
import { MongoClient, ObjectId } from "mongodb";

const router = express.Router();

// ==============================
// CONFIG
// ==============================
const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET;
const APP_URL = process.env.APP_URL;

// ==============================
// DB
// ==============================
const client = new MongoClient(process.env.MONGO_URI);
let usersCollection;

async function connectDB() {
  if (!usersCollection) {
    await client.connect();
    const db = client.db("esteborg");
    usersCollection = db.collection("users");
    console.log("✅ Mongo connected (authRoutes)");
  }
}

// ==============================
// REGISTER
// ==============================
router.post("/register", async (req, res) => {
  try {
    await connectDB();

    const { email, password } = req.body;

    const existing = await usersCollection.findOne({ email });
    if (existing) {
      return res.status(400).json({ ok: false, error: "user_exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    await usersCollection.insertOne({
      email,
      password: hash,
      modules: [],
      plan: "free",
      createdAt: new Date()
    });

    return res.json({ ok: true });

  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});

// ==============================
// LOGIN
// ==============================
router.post("/login", async (req, res) => {
  try {
    await connectDB();

    const { email, password } = req.body;

    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(401).json({ ok: false });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ ok: false });
    }

    const token = jwt.sign(
      {
        uid: user._id,
        email: user.email,
        modules: user.modules || [],
        plan: user.plan || "free"
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      ok: true,
      token,
      user: {
        email: user.email,
        modules: user.modules || [],
        plan: user.plan || "free"
      }
    });

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});

// ==============================
// FORGOT PASSWORD
// ==============================
router.post("/forgot", async (req, res) => {
  try {
    await connectDB();

    const { email } = req.body;

    console.log("[FORGOT] Request for:", email);

    const user = await usersCollection.findOne({ email });

    // 🔒 no revelar si existe
    if (!user) {
      return res.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString("hex");

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          resetToken: token,
          resetTokenExpires: Date.now() + 1000 * 60 * 15
        }
      }
    );

    if (!APP_URL) {
      console.error("❌ APP_URL no definido");
      return res.status(500).json({ ok: false, error: "missing_app_url" });
    }

    const resetLink = `${APP_URL}/#reset?token=${token}`;

    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Recuperación de contraseña",
      html: `
        <div style="background:#0b0b0f;padding:40px;font-family:Arial;color:#fff">
          <h2 style="color:#d4af37;">Recuperación de contraseña</h2>
          <p>Haz clic en el botón para crear una nueva contraseña.</p>
          
          <a href="${resetLink}" 
             style="display:inline-block;margin-top:20px;padding:14px 24px;
                    background:#d4af37;color:#000;border-radius:10px;
                    text-decoration:none;font-weight:bold;">
            Resetear contraseña
          </a>

          <p style="margin-top:20px;color:#aaa;">
            Este link expira en 15 minutos.
          </p>
        </div>
      `
    });

    console.log("📨 RESEND RESPONSE:", response);

    if (response?.error) {
      console.error("❌ RESEND ERROR:", response.error);
      return res.status(500).json({ ok: false, error: "email_failed" });
    }

    return res.json({ ok: true });

  } catch (err) {
    console.error("❌ FORGOT ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});

// ==============================
// RESET PASSWORD
// ==============================
router.post("/reset", async (req, res) => {
  try {
    await connectDB();

    const { token, password } = req.body;

    const user = await usersCollection.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ ok: false, error: "invalid_token" });
    }

    const hash = await bcrypt.hash(password, 10);

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { password: hash },
        $unset: {
          resetToken: "",
          resetTokenExpires: ""
        }
      }
    );

    return res.json({ ok: true });

  } catch (err) {
    console.error("❌ RESET ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});

export default router;

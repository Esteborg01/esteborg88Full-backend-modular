import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDb } from "../config/mongoClient.mjs";
import { requireAuth } from "../middleware/requireAuth.mjs";

const router = express.Router();

/*
  =========================
  REGISTER (SIN VIP)
  =========================
*/
router.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email_and_password_required" });
    }

    const db = await getDb();
    const users = db.collection("users");

    const normalizedEmail = String(email).toLowerCase().trim();

    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ ok: false, error: "user_already_exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userDoc = {
      email: normalizedEmail,
      passwordHash,
      plan: "none",
      modulesAllowed: [],
      vipExpiresAt: null,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await users.insertOne(userDoc);

    return res.json({ ok: true });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});


/*
  =========================
  LOGIN
  =========================
*/
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email_and_password_required" });
    }

    const db = await getDb();
    const users = db.collection("users");

    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await users.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET_missing");
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
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


/*
  =========================
  AUTH ME (ÁREA PROTEGIDA)
  =========================
*/
router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const users = db.collection("users");

    const email = String(req.user?.email || "").toLowerCase().trim();
    const user = await users.findOne({ email });

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
    console.error("auth/me error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});


export default router;

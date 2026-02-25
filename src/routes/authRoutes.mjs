import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getDb } from "../config/mongoClient.mjs";
import { addDays, getVipDurationDays } from "../core/vipRules.mjs";

const router = express.Router();

/**
 * Helper: extrae Bearer token del header Authorization
 */
function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  return token ? token : null;
}

/**
 * Helper: valida JWT y regresa payload
 */
function verifyJwt(token) {
  if (!process.env.JWT_SECRET) {
    const e = new Error("jwt_secret_missing");
    e.code = "jwt_secret_missing";
    throw e;
  }
  return jwt.verify(token, process.env.JWT_SECRET);
}

// ✅ REGISTER
router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, plan, modulesAllowed } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, error: "email_and_password_required" });
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

    const userDoc = {
      email: normalizedEmail,
      passwordHash,
      plan: safePlan,
      modulesAllowed: Array.isArray(modulesAllowed) ? modulesAllowed : [],
      vipExpiresAt,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await users.insertOne(userDoc);

    // Nota: register no entrega token (según tu flujo actual).
    // Si quieres que sí lo entregue, lo ajustamos luego.
    return res.status(201).json({
      ok: true,
      email: userDoc.email,
      plan: userDoc.plan,
      vipExpiresAt: userDoc.vipExpiresAt,
    });
  } catch (err) {
    // ✅ Duplicate key (por si acaso)
    if (err?.code === 11000) {
      return res.status(409).json({ ok: false, error: "email_already_exists" });
    }

    console.error("register error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

// ✅ LOGIN
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, error: "email_and_password_required" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ ok: false, error: "jwt_secret_missing" });
    }

    const db = await getDb();
    const users = db.collection("users");

    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await users.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    const okPass = await bcrypt.compare(String(password), user.passwordHash);
    if (!okPass) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    // ✅ JWT payload (lo mínimo)
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
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

// ✅ ME (lo que te faltaba)
// GET /api/auth/me
router.get("/auth/me", async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "missing_token" });
    }

    let payload;
    try {
      payload = verifyJwt(token);
    } catch (e) {
      if (e?.code === "jwt_secret_missing") {
        return res.status(500).json({ ok: false, error: "jwt_secret_missing" });
      }
      return res.status(401).json({ ok: false, error: "invalid_token" });
    }

    const userId = payload?.sub;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "invalid_token" });
    }

    const db = await getDb();
    const users = db.collection("users");

    let oid;
    try {
      oid = new ObjectId(String(userId));
    } catch {
      return res.status(401).json({ ok: false, error: "invalid_token" });
    }

    const user = await users.findOne({ _id: oid });
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
    console.error("me error:", err);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;

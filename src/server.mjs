import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;

// =============================
// CORS
// =============================

app.use(cors({
  origin: [
    "https://esteborg.live",
    "https://membersvip.esteborg.live"
  ],
  credentials: true
}));

// =============================
// DEBUG REQUESTS
// =============================

app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// =============================
// DYNAMIC LOADS
// =============================

let authRoutes = null;
let healthRoutes = null;
let billingRoutes = null;
let stripeWebhookHandler = null;

let registerEsteborgFullRoutes = null;
let registerComunicaRoutes = null;
let registerVentasRoutes = null;
let registerErpevRoutes = null;
let registerIaVipComRoutes = null;
let registerTokkenRoutes = null;
let registerDemoRoutes = null;

let openai = null;

try {
  const openaiMod = await import("./config/openaiClient.mjs");
  openai = openaiMod.openai || openaiMod.default || null;
  console.log("✅ openaiClient cargado");
} catch (e) {
  console.error("❌ openaiClient ERROR:", e.message);
}

try {
  const authMod = await import("./routes/authRoutes.mjs");
  authRoutes = authMod.default || null;
  console.log("✅ authRoutes cargado");
} catch (e) {
  console.error("❌ authRoutes ERROR:", e.message);
}

try {
  const healthMod = await import("./routes/healthRoutes.mjs");
  healthRoutes = healthMod.default || null;
  console.log("✅ healthRoutes cargado");
} catch (e) {
  console.error("❌ healthRoutes ERROR:", e.message);
}

try {
  const billingMod = await import("./routes/billingRoutes.mjs");
  billingRoutes = billingMod.default || null;
  console.log("✅ billingRoutes cargado");
} catch (e) {
  console.error("❌ billingRoutes ERROR:", e.message);
}

try {
  const stripeMod = await import("./routes/stripeWebhook.mjs");
  stripeWebhookHandler =
    stripeMod.stripeWebhookHandler ||
    stripeMod.default ||
    null;
  console.log("✅ stripeWebhook cargado");
} catch (e) {
  console.error("❌ stripeWebhook ERROR:", e.message);
}

try {
  const mod = await import("./modules/esteborgFullRoutes.mjs");
  registerEsteborgFullRoutes =
    mod.registerEsteborgFullRoutes ||
    mod.default ||
    null;
  console.log("✅ esteborgFullRoutes cargado");
} catch (e) {
  console.error("❌ esteborgFullRoutes ERROR:", e.message);
}

try {
  const mod = await import("./modules/comunicaRoutes.mjs");
  registerComunicaRoutes =
    mod.registerComunicaRoutes ||
    mod.default ||
    null;
  console.log("✅ comunicaRoutes cargado");
} catch (e) {
  console.error("❌ comunicaRoutes ERROR:", e.message);
}

try {
  const mod = await import("./modules/ventasRoutes.mjs");
  registerVentasRoutes =
    mod.registerVentasRoutes ||
    mod.default ||
    null;
  console.log("✅ ventasRoutes cargado");
} catch (e) {
  console.error("❌ ventasRoutes ERROR:", e.message);
}

try {
  const mod = await import("./modules/erpevRoutes.mjs");
  registerErpevRoutes =
    mod.registerErpevRoutes ||
    mod.default ||
    null;
  console.log("✅ erpevRoutes cargado");
} catch (e) {
  console.error("❌ erpevRoutes ERROR:", e.message);
}

try {
  const mod = await import("./modules/iavipcomRoutes.mjs");
  registerIaVipComRoutes =
    mod.registerIaVipComRoutes ||
    mod.default ||
    null;
  console.log("✅ iavipcomRoutes cargado");
} catch (e) {
  console.error("❌ iavipcomRoutes ERROR:", e.message);
}

try {
  const mod = await import("./modules/tokkenRoutes.mjs");
  registerTokkenRoutes =
    mod.registerTokkenRoutes ||
    mod.default ||
    null;
  console.log("✅ tokkenRoutes cargado");
} catch (e) {
  console.error("❌ tokkenRoutes ERROR:", e.message);
}

try {
  const mod = await import("./modules/demoWelcomeRoutes.mjs");
  registerDemoRoutes =
    mod.registerDemoRoutes ||
    mod.registerDemoWelcomeRoutes ||
    mod.default ||
    null;
  console.log("✅ demoWelcomeRoutes cargado");
} catch (e) {
  console.error("❌ demoWelcomeRoutes ERROR:", e.message);
}

// =============================
// STRIPE WEBHOOK FIRST
// =============================

if (stripeWebhookHandler) {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler
  );
}

// =============================
// BODY PARSERS
// =============================

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// =============================
// BASIC ROUTES
// =============================

if (healthRoutes) app.use("/api", healthRoutes);
if (authRoutes) app.use("/api/auth", authRoutes);
if (billingRoutes) app.use("/api", billingRoutes);

// =============================
// MODULE REGISTRATION
// =============================

let flags = {
  auth: !!authRoutes,
  health: !!healthRoutes,
  billing: !!billingRoutes,
  stripe: !!stripeWebhookHandler,
  esteborgFull: false,
  iavip: false,
  comunica: false,
  ventas: false,
  erpev: false,
  tokken: false,
  demo: false
};

try {
  if (typeof registerEsteborgFullRoutes === "function") {
    registerEsteborgFullRoutes(app, openai);
    flags.esteborgFull = true;
    console.log("🔥 esteborgFullRoutes registrado");
  }
} catch (e) {
  console.error("❌ esteborgFull register ERROR:", e.message);
}

try {
  if (typeof registerIaVipComRoutes === "function") {
    registerIaVipComRoutes(app, openai);
    flags.iavip = true;
    console.log("🔥 iavipcomRoutes registrado");
  }
} catch (e) {
  console.error("❌ iavip register ERROR:", e.message);
}

try {
  if (typeof registerComunicaRoutes === "function") {
    registerComunicaRoutes(app, openai);
    flags.comunica = true;
    console.log("🔥 comunicaRoutes registrado");
  }
} catch (e) {
  console.error("❌ comunica register ERROR:", e.message);
}

try {
  if (typeof registerVentasRoutes === "function") {
    registerVentasRoutes(app, openai);
    flags.ventas = true;
    console.log("🔥 ventasRoutes registrado");
  }
} catch (e) {
  console.error("❌ ventas register ERROR:", e.message);
}

try {
  if (typeof registerErpevRoutes === "function") {
    registerErpevRoutes(app, openai);
    flags.erpev = true;
    console.log("🔥 erpevRoutes registrado");
  }
} catch (e) {
  console.error("❌ erpev register ERROR:", e.message);
}

try {
  if (typeof registerTokkenRoutes === "function") {
    registerTokkenRoutes(app, openai);
    flags.tokken = true;
    console.log("🔥 tokkenRoutes registrado");
  }
} catch (e) {
  console.error("❌ tokken register ERROR:", e.message);
}

try {
  if (typeof registerDemoRoutes === "function") {
    registerDemoRoutes(app, openai);
    flags.demo = true;
    console.log("🔥 demoRoutes registrado");
  }
} catch (e) {
  console.error("❌ demo register ERROR:", e.message);
}

// =============================
// DEBUG
// =============================

app.get("/__debug", (req, res) => {
  res.json({
    auth: flags.auth,
    iavip: flags.iavip,
    comunica: flags.comunica,
    ventas: flags.ventas,
    erpev: flags.erpev,
    time: new Date()
  });
});

app.get("/", (req, res) => {
  res.send("Esteborg backend OK 🚀");
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "route_not_found",
    path: req.originalUrl
  });
});

// =============================
// START
// =============================

async function start() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();

    const db = client.db();
    app.locals.db = db;

    console.log("✅ Mongo conectado");

    app.listen(PORT, () => {
      console.log(`🚀 Server corriendo en puerto ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Mongo error:", err);
    process.exit(1);
  }
}

start();

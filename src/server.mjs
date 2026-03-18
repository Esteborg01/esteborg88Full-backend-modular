import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

import { openai } from "./config/openaiClient.mjs";

import authRoutes from "./routes/authRoutes.mjs";
import healthRoutes from "./routes/healthRoutes.mjs";
import billingRoutes from "./routes/billingRoutes.mjs";
import { stripeWebhookHandler } from "./routes/stripeWebhook.mjs";

import { registerEsteborgFullRoutes } from "./modules/esteborgFullRoutes.mjs";
import { registerIaVipComRoutes } from "./modules/iavipcomRoutes.mjs";
import { registerComunicaRoutes } from "./modules/comunicaRoutes.mjs";
import { registerVentasRoutes } from "./modules/ventasRoutes.mjs";
import { registerErpevRoutes } from "./modules/erpevRoutes.mjs";
import { registerTokkenRoutes } from "./modules/tokkenRoutes.mjs";
import { registerDemoRoutes } from "./modules/demoWelcomeRoutes.mjs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;

// =============================
// CORS
// =============================

app.use(cors({
  origin: [
    "https://membersvip.esteborg.live",
    "https://esteborg.live",
    "https://www.esteborg.live"
  ],
  credentials: true
}));

// =============================
// REQUEST LOG
// =============================

app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// =============================
// STRIPE WEBHOOK RAW BODY
// =============================

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

// =============================
// BODY PARSERS
// =============================

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// =============================
// CORE ROUTES
// =============================

app.use("/api/auth", authRoutes);
app.use("/api", healthRoutes);
app.use("/api", billingRoutes);

// =============================
// MODULE ROUTES
// =============================

let flags = {
  auth: true,
  health: true,
  billing: true,
  stripe: true,
  esteborgFull: false,
  iavip: false,
  comunica: false,
  ventas: false,
  erpev: false,
  tokken: false,
  demo: false
};

try {
  registerEsteborgFullRoutes(app, openai);
  flags.esteborgFull = true;
  console.log("🔥 esteborgFullRoutes registrado");
} catch (e) {
  console.error("❌ esteborgFullRoutes ERROR:", e.message);
}

try {
  registerIaVipComRoutes(app, openai);
  flags.iavip = true;
  console.log("🔥 iavipcomRoutes registrado");
} catch (e) {
  console.error("❌ iavipcomRoutes ERROR:", e.message);
}

try {
  registerComunicaRoutes(app, openai);
  flags.comunica = true;
  console.log("🔥 comunicaRoutes registrado");
} catch (e) {
  console.error("❌ comunicaRoutes ERROR:", e.message);
}

try {
  registerVentasRoutes(app, openai);
  flags.ventas = true;
  console.log("🔥 ventasRoutes registrado");
} catch (e) {
  console.error("❌ ventasRoutes ERROR:", e.message);
}

try {
  registerErpevRoutes(app, openai);
  flags.erpev = true;
  console.log("🔥 erpevRoutes registrado");
} catch (e) {
  console.error("❌ erpevRoutes ERROR:", e.message);
}

try {
  registerTokkenRoutes(app, openai);
  flags.tokken = true;
  console.log("🔥 tokkenRoutes registrado");
} catch (e) {
  console.error("❌ tokkenRoutes ERROR:", e.message);
}

try {
  registerDemoRoutes(app, openai);
  flags.demo = true;
  console.log("🔥 demoRoutes registrado");
} catch (e) {
  console.error("❌ demoRoutes ERROR:", e.message);
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

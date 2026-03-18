import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

// ROUTES
import authRoutes from "./src/routes/authRoutes.mjs";
import stripeWebhook from "./src/routes/stripeWebhook.mjs";

dotenv.config();

const app = express();

// =============================
// CONFIG
// =============================

const PORT = process.env.PORT || 10000;

const MONGO_URI = process.env.MONGO_URI;

// =============================
// CORS (para Carrd)
// =============================

app.use(cors({
  origin: [
    "https://esteborg.live",
    "https://membersvip.esteborg.live"
  ],
  credentials: true
}));

// =============================
// STRIPE WEBHOOK (RAW BODY)
// ⚠️ VA ANTES DE express.json()
// =============================

app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// =============================
// JSON PARSER
// =============================

app.use(express.json());

// =============================
// DEBUG ROUTES (para no volvernos locos)
// =============================

app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// =============================
// ROUTES
// =============================

// 🔥 ESTA ES LA LÍNEA CLAVE
app.use("/api/auth", authRoutes);

// =============================
// HEALTH CHECK
// =============================

app.get("/", (req, res) => {
  res.send("Esteborg backend OK 🚀");
});

// =============================
// 404 HANDLER
// =============================

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "route_not_found",
    path: req.originalUrl
  });
});

// =============================
// START SERVER + MONGO
// =============================

async function start() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();

    const db = client.db();

    app.locals.db = db;

    console.log("✅ Mongo connected");

    app.listen(PORT, () => {
      console.log(`🚀 Esteborg backend running on port ${PORT}`);
      console.log(`🔥 Auth ready at /api/auth`);
    });

  } catch (err) {
    console.error("❌ Mongo connection error:", err);
    process.exit(1);
  }
}

start();

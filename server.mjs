import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

// Rutas
import authRoutes from "./routes/authRoutes.mjs";
import stripeWebhook from "./routes/stripeWebhook.mjs";

dotenv.config();

const app = express();

/* =========================
CORS
========================= */
app.use(cors({
  origin: [
    process.env.PUBLIC_APP_URL,
    process.env.APP_URL,
    "https://membersvip.esteborg.live"
  ],
  credentials: true
}));

/* =========================
STRIPE WEBHOOK (RAW BODY)
DEBE IR ANTES DE express.json()
========================= */
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

/* =========================
BODY PARSER NORMAL
========================= */
app.use(express.json({ limit: "1mb" }));

/* =========================
MONGO CONNECTION
========================= */

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI missing");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGO_URI);

await client.connect();

const db = client.db();

console.log("✅ Mongo connected");

/* =========================
API ROUTES
========================= */

app.use("/api/auth", authRoutes(db));

/* =========================
HEALTHCHECK (Render)
========================= */

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "esteborg-backend",
    time: new Date()
  });
});

/* =========================
ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    ok: false,
    error: "internal_server_error"
  });
});

/* =========================
START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Esteborg backend running on port ${PORT}`);
});

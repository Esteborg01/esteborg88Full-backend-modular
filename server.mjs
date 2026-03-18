import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import healthRoutes from "./src/routes/healthRoutes.mjs";
import authRoutes from "./src/routes/authRoutes.mjs";
import billingRoutes from "./src/routes/billingRoutes.mjs";
import { stripeWebhookHandler } from "./src/routes/stripeWebhook.mjs";

import { registerEsteborgFullRoutes } from "./src/modules/esteborgFullRoutes.mjs";
import { registerComunicaRoutes } from "./src/modules/comunicaRoutes.mjs";
import { registerVentasRoutes } from "./src/modules/ventasRoutes.mjs";
import { registerErpevRoutes } from "./src/modules/erpevRoutes.mjs";
import { registerIaVipComRoutes } from "./src/modules/iavipcomRoutes.mjs";
import { registerTokkenRoutes } from "./src/modules/tokkenRoutes.mjs";
import { registerDemoRoutes } from "./src/modules/demoWelcomeRoutes.mjs";

import { rateLimiter } from "./src/middleware/rateLimiter.mjs";
import { compressHistoryMiddleware } from "./src/middleware/compressHistory.mjs";
import { longMessageGuard } from "./src/middleware/longMessageGuard.mjs";

import { openai } from "./src/config/openaiClient.mjs";

dotenv.config();

const app = express();

/* =========================
CORS
========================= */

app.use(cors({
 origin: "*"
}));

/* =========================
STRIPE WEBHOOK
Debe ir ANTES del body parser
========================= */

app.post(
 "/api/stripe/webhook",
 express.raw({ type: "application/json" }),
 stripeWebhookHandler
);

/* =========================
BODY PARSER
========================= */

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
MIDDLEWARE GLOBAL
========================= */

app.use(rateLimiter);
app.use(longMessageGuard);
app.use(compressHistoryMiddleware);

/* =========================
ROUTES
========================= */

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", billingRoutes);

/* =========================
IA MODULES
========================= */

registerEsteborgFullRoutes(app, openai);
registerComunicaRoutes(app, openai);
registerVentasRoutes(app, openai);
registerErpevRoutes(app, openai);
registerIaVipComRoutes(app, openai);
registerTokkenRoutes(app, openai);
registerDemoRoutes(app, openai);

/* =========================
ROOT
========================= */

app.get("/", (req, res) => {
 res.send("Esteborg backend modular running");
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

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {

 console.log("🚀 Esteborg backend running on port", PORT);

});

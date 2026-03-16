// server.mjs
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { compressHistoryMiddleware } from "./middleware/compressHistory.mjs";
import { rateLimiter } from "./middleware/rateLimiter.mjs";
import { longMessageGuard } from "./middleware/longMessageGuard.mjs";

import { openai } from "./config/openaiClient.mjs";

import { registerEsteborgFullRoutes } from "./modules/esteborgFullRoutes.mjs";
import { registerComunicaRoutes } from "./modules/comunicaRoutes.mjs";
import { registerVentasRoutes } from "./modules/ventasRoutes.mjs";
import { registerErpevRoutes } from "./modules/erpevRoutes.mjs";
import { registerDemoRoutes } from "./modules/demoWelcomeRoutes.mjs";
import { registerTokkenRoutes } from "./modules/tokkenRoutes.mjs";
import { registerIaVipComRoutes } from "./modules/iavipcomRoutes.mjs";

import healthRoutes from "./routes/healthRoutes.mjs";
import authRoutes from "./routes/authRoutes.mjs";
import billingRoutes from "./routes/billingRoutes.mjs";

import { stripeWebhookHandler } from "./routes/stripeWebhook.mjs";

dotenv.config();

const app = express();

app.use(cors());

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(rateLimiter);
app.use(longMessageGuard);
app.use(compressHistoryMiddleware);

app.use("/api", healthRoutes);
app.use("/api", authRoutes);
app.use("/api", billingRoutes);

app.get("/", (req, res) => {
  res.send("Esteborg backend modular está vivo ✅");
});

registerEsteborgFullRoutes(app, openai);
registerComunicaRoutes(app, openai);
registerVentasRoutes(app, openai);
registerErpevRoutes(app, openai);
registerDemoRoutes(app, openai);
registerTokkenRoutes(app, openai);
registerIaVipComRoutes(app, openai);

app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

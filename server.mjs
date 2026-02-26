// server.mjs
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { compressHistoryMiddleware } from "./src/middleware/compressHistory.mjs";
import { rateLimiter } from "./src/middleware/rateLimiter.mjs";
import { longMessageGuard } from "./src/middleware/longMessageGuard.mjs";

// Cliente OpenAI
import { openai } from "./src/config/openaiClient.mjs";

// Rutas por módulo
import { registerEsteborgFullRoutes } from "./src/modules/esteborgFullRoutes.mjs";
import { registerComunicaRoutes } from "./src/modules/comunicaRoutes.mjs";
import { registerVentasRoutes } from "./src/modules/ventasRoutes.mjs";
import { registerErpevRoutes } from "./src/modules/erpevRoutes.mjs";
import { registerDemoRoutes } from "./src/modules/demoWelcomeRoutes.mjs";
import { registerTokkenRoutes } from "./src/modules/tokkenRoutes.mjs";
import { registerIaVipComRoutes } from "./src/modules/iavipcomRoutes.mjs";

// Rutas base
import healthRoutes from "./src/routes/healthRoutes.mjs";
import authRoutes from "./src/routes/authRoutes.mjs";
import billingRoutes from "./src/routes/billingRoutes.mjs";

// ✅ NUEVO: Stripe Webhook (RAW)
import { stripeWebhookHandler } from "./src/routes/stripeWebhook.mjs";

dotenv.config();

const app = express();

// 1) CORS primero
app.use(cors());

// ✅ 2) Stripe Webhook ANTES de express.json
// Stripe firma el body RAW. Si pasas por express.json, se rompe la firma.
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

// 3) Body parsers DESPUÉS (para el resto del API)
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// 4) Middlewares comunes
app.use(rateLimiter);
app.use(longMessageGuard);
app.use(compressHistoryMiddleware);

// 5) Rutas base
app.use("/api", healthRoutes);
app.use("/api", authRoutes);
app.use("/api", billingRoutes);

// Root health
app.get("/", (req, res) => {
  res.send("Esteborg backend modular está vivo ✅");
});

// 6) Registrar módulos (rutas)
registerEsteborgFullRoutes(app, openai);
registerComunicaRoutes(app, openai);
registerVentasRoutes(app, openai);
registerErpevRoutes(app, openai);
registerDemoRoutes(app, openai);
registerTokkenRoutes(app, openai);
registerIaVipComRoutes(app, openai);

// 7) Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

// 8) Error handler
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
});

// 9) LISTEN
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

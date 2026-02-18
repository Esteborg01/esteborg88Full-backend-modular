// server.mjs
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import billingRoutes from "./src/routes/billingRoutes.mjs";

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
import { registerVoiceRoutes } from "./src/modules/voiceRoutes.mjs";
import { registerTokkenRoutes } from "./src/modules/tokkenRoutes.mjs";
import { registerIaVipComRoutes } from "./src/modules/iavipcomRoutes.mjs";

// Rutas base
import healthRoutes from "./src/routes/healthRoutes.mjs";
import authRoutes from "./src/routes/authRoutes.mjs";

dotenv.config();

const app = express();

// 1) CORS primero
app.use(cors());

// 2) Body parsers ANTES de cualquier ruta (para que req.body NO sea undefined)
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ Stripe webhook necesita RAW body
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

// 3) Middlewares comunes
app.use(rateLimiter);
app.use(longMessageGuard);
app.use(compressHistoryMiddleware);

// 4) Rutas base
app.use("/api", healthRoutes);
app.use("/api", authRoutes);
app.use("/api", billingRoutes);

// Root health
app.get("/", (req, res) => {
  res.send("Esteborg backend modular está vivo ✅");
});

// 5) Registrar módulos (rutas)
registerEsteborgFullRoutes(app, openai);
registerComunicaRoutes(app, openai);
registerVentasRoutes(app, openai);
registerErpevRoutes(app, openai);
registerDemoRoutes(app, openai);
registerVoiceRoutes(app, openai);
registerTokkenRoutes(app, openai);
registerIaVipComRoutes(app, openai);

// 6) Fallback 404 (si no encontró ruta)
app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

// 7) Error handler (último)
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
});

// 8) LISTEN (UNA SOLA VEZ, AL FINAL)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

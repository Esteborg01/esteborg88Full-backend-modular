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
import { registerVoiceRoutes } from "./src/modules/voiceRoutes.mjs";
import { registerTokkenRoutes } from "./src/modules/tokkenRoutes.mjs";
import { registerIaVipComRoutes } from "./src/modules/iavipcomRoutes.mjs";

// Health routes
import healthRoutes from "./src/routes/healthRoutes.mjs";

dotenv.config();

const app = express();

// CORS (simple por ahora; luego lo endurecemos)
app.use(cors());

// Body parser
app.use(express.json({ limit: "2mb" }));

// Middlewares comunes
app.use(rateLimiter);
app.use(longMessageGuard);
app.use(compressHistoryMiddleware);

// Health endpoints
app.use("/api", healthRoutes);

// Root health
app.get("/", (req, res) => {
  res.send("Esteborg backend modular está vivo ✅");
});

// Registrar módulos (rutas)
registerEsteborgFullRoutes(app, openai);
registerComunicaRoutes(app, openai);
registerVentasRoutes(app, openai);
registerErpevRoutes(app, openai);
registerDemoRoutes(app, openai);
registerVoiceRoutes(app, openai);
registerTokkenRoutes(app, openai);
registerIaVipComRoutes(app, openai);

// Fallback 404 (si no encontró ruta)
app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

// Error handler (último)
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
});

// LISTEN (UNA SOLA VEZ, AL FINAL)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

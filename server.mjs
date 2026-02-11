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
import healthRoutes from "./src/routes/healthRoutes.mjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Middleware comunes
app.use(rateLimiter);
app.use(longMessageGuard);
app.use(compressHistoryMiddleware);
app.use("/api", healthRoutes);

const PORT = process.env.PORT || 10000;

// Health
app.get("/", (req, res) => {
  res.send("Esteborg backend modular está vivo ✅");
});

// Registrar módulos
registerEsteborgFullRoutes(app, openai);
registerComunicaRoutes(app, openai);
registerVentasRoutes(app, openai);
registerErpevRoutes(app, openai);
registerDemoRoutes(app, openai);
registerVoiceRoutes(app, openai);
registerTokkenRoutes(app, openai);
registerIaVipComRoutes(app, openai);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
});

app.listen(PORT, () => {
  console.log(`✅ Server escuchando en puerto ${PORT}`);
});

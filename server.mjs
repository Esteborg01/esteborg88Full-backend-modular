// server.mjs
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Middlewares existentes de tu repo
import { compressHistoryMiddleware } from "./src/middleware/compressHistory.mjs";
import { rateLimiter } from "./src/middleware/rateLimiter.mjs";
import { longMessageGuard } from "./src/middleware/longMessageGuard.mjs";
import { modelSelector } from "./src/middleware/modelSelector.mjs";

// Cliente OpenAI compartido
import { openai } from "./src/config/openaiClient.mjs";

// Rutas de módulos que SÍ existen en tu repo
import { registerComunicaRoutes } from "./src/modules/comunicaRoutes.mjs";
import { registerDemoRoutes } from "./src/modules/demoWelcomeRoutes.mjs";
import { registerErpevRoutes } from "./src/modules/erpevRoutes.mjs";
import { registerEsteborgFullRoutes } from "./src/modules/esteborgFullRoutes.mjs";
import { registerIaVipComRoutes } from "./src/modules/iavipcomRoutes.mjs";
import { registerTokkenRoutes } from "./src/modules/tokkenRoutes.mjs";
import { registerVentasRoutes } from "./src/modules/ventasRoutes.mjs";
import { registerVoiceRoutes } from "./src/modules/voiceRoutes.mjs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware base
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Middlewares Esteborg
app.use(compressHistoryMiddleware);
app.use(rateLimiter);
app.use(longMessageGuard);
app.use(modelSelector);

// Healthcheck sencillo
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Esteborg modular backend",
    version: "1.0.0",
  });
});

// Registro de módulos (cada uno monta su propia ruta /api/modules/...)
registerComunicaRoutes(app, openai);
registerDemoRoutes(app, openai);
registerErpevRoutes(app, openai);
registerEsteborgFullRoutes(app, openai);
registerIaVipComRoutes(app, openai);
registerTokkenRoutes(app);
registerVentasRoutes(app, openai);
registerVoiceRoutes(app, openai);

// 404 final
app.use((req, res) => {
  res.status(404).json({
    error: "not_found",
    path: req.path,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Esteborg modular escuchando en puerto ${PORT}`);
});

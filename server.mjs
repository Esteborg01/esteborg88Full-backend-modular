// server.mjs
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { compressHistoryMiddleware } from "./src/middleware/compressHistory.mjs";
import { rateLimiter } from "./src/middleware/rateLimiter.mjs";
import { longMessageGuard } from "./src/middleware/longMessageGuard.mjs";
import { modelSelector } from "./src/middleware/modelSelector.mjs";

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
import { registerIaVipComRoutes } from "./src/modules/iavipcom.mjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(rateLimiter);
app.use(longMessageGuard);
app.use(compressHistoryMiddleware);
app.use(modelSelector);

const PORT = process.env.PORT || 10000;

// Ruta de salud
app.get("/", (req, res) => {
  res.send("Esteborg backend modular está vivo ✅");
});

// Registrar módulos principales
registerEsteborgFullRoutes(app, openai);
registerComunicaRoutes(app, openai);
registerVentasRoutes(app, openai);
registerErpevRoutes(app, openai);
registerDemoRoutes(app, openai);
registerIaVipComRoutes(app, openai);

// Módulo Tokken Members (generate-token)
registerTokkenRoutes(app);

// Rutas de voz (ElevenLabs)
registerVoiceRoutes(app);

// 404 genérico por si alguien pega a una ruta que no existe
app.use((req, res) => {
  return res.status(404).json({
    error: "not_found",
    message: "Ruta no encontrada en el backend de Esteborg.",
  });
});

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Esteborg modular escuchando en puerto ${PORT}`);
});

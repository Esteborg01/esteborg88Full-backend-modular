// server.mjs
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { compressHistoryMiddleware } from "./src/middleware/compressHistory.mjs";
import { rateLimiter } from "./src/middleware/rateLimiter.mjs";
import { longMessageGuard } from "./src/middleware/longMessageGuard.mjs";
import { modelSelector } from "./src/middleware/modelSelector.mjs";

// Cliente OpenAI compartido
import { openai } from "./src/config/openaiClient.mjs";

// Rutas de módulos
import { registerEsteborgFullRoutes } from "./src/modules/esteborgFullRoutes.mjs";
import { registerComunicaRoutes } from "./src/modules/comunicaRoutes.mjs";
import { registerVentasRoutes } from "./src/modules/ventasRoutes.mjs";
import { registerErpevRoutes } from "./src/modules/erpevRoutes.mjs";
import { registerIaVipComRoutes } from "./src/modules/iavipcomRoutes.mjs";
import { registerVoiceRoutes } from "./src/modules/voiceRoutes.mjs";
import { registerTokkenRoutes } from "./src/modules/tokkenRoutes.mjs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// CORS y JSON
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

// 🔁 Compatibilidad: aceptar /modules/* y redirigir interno a /api/modules/*
app.use("/modules", (req, res, next) => {
  // Ej: /modules/iavipcom  ->  /api/modules/iavipcom
  req.url = "/api" + req.url;
  next();
});

// Middlewares compartidos (los que ya usaban los otros GPTs)
app.use(compressHistoryMiddleware);
app.use(rateLimiter);
app.use(longMessageGuard);
app.use(modelSelector);

// Registro de TODOS los módulos que ya tenías funcionando
registerEsteborgFullRoutes(app, openai);
registerComunicaRoutes(app, openai);
registerVentasRoutes(app, openai);
registerErpevRoutes(app, openai);
registerIaVipComRoutes(app, openai); // <- NUEVO módulo IA VIP COM
registerVoiceRoutes(app);
registerTokkenRoutes(app);

// 404 genérico
app.use((req, res) => {
  return res.status(404).json({
    error: "not_found",
    message: "Ruta no encontrada en el backend de Esteborg.",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Esteborg modular escuchando en puerto ${PORT}`);
});

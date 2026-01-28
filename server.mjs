// server.mjs
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Middlewares propios
import { compressHistoryMiddleware } from "./src/middleware/compressHistory.mjs";
import { rateLimiter } from "./src/middleware/rateLimiter.mjs";
import { longMessageGuard } from "./src/middleware/longMessageGuard.mjs";

// Cliente OpenAI central
import { openai } from "./src/config/openaiClient.mjs";

// Rutas por módulo (las que ya tenías)
import { registerEsteborgFullRoutes } from "./src/modules/esteborgFullRoutes.mjs";
import { registerComunicaRoutes } from "./src/modules/comunicaRoutes.mjs";
import { registerVentasRoutes } from "./src/modules/ventasRoutes.mjs";
import { registerErpevRoutes } from "./src/modules/erpevRoutes.mjs";
import { registerDemoRoutes } from "./src/modules/demoWelcomeRoutes.mjs";
import { registerVoiceRoutes } from "./src/modules/voiceRoutes.mjs";
import { registerTokkenRoutes } from "./src/modules/tokkenRoutes.mjs";

// ✅ NUEVO: módulo Esteborg IA – iavipcom
import { registerIaVipComRoutes } from "./src/modules/iavipcomRoutes.mjs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// CORS (déjalo abierto o ajusta si quieres restringir dominios)
app.use(
  cors({
    origin: true,          // permite los orígenes que te llamen
    credentials: true,
  })
);

// JSON body
app.use(express.json({ limit: "2mb" }));

// Health check simple
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Esteborg Backend Modular",
    message: "Backend Esteborg operativo",
  });
});

// Middlewares globales para chats
app.use(compressHistoryMiddleware);
app.use(rateLimiter);
app.use(longMessageGuard);

// 🔌 Registro de módulos (todos usando el MISMO cliente OpenAI)
registerEsteborgFullRoutes(app, openai);
registerComunicaRoutes(app, openai);
registerVentasRoutes(app, openai);
registerErpevRoutes(app, openai);
registerDemoRoutes(app, openai);

// ✅ Nuevo módulo IA VIP
registerIaVipComRoutes(app, openai);

// Tokken + Voz (no dependen de OpenAI directamente)
registerTokkenRoutes(app);
registerVoiceRoutes(app);

// 404 genérico (por si pegan a rutas raras)
app.use((req, res) => {
  return res.status(404).json({
    error: "not_found",
    message: "Ruta no encontrada en el backend de Esteborg.",
  });
});

// Manejo de errores no controlados
app.use((err, req, res, next) => {
  console.error("❌ Error no manejado en el servidor:", err);
  res.status(500).json({
    error: "internal_error",
    message: "Ocurrió un error en el backend de Esteborg.",
  });
});

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Esteborg modular escuchando en puerto ${PORT}`);
});

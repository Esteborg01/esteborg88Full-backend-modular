// server.mjs
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import OpenAI from "openai";

// Rutas por módulo (las que ya tenías funcionando)
import { registerTokkenRoutes } from "./src/modules/tokkenRoutes.mjs";
import { registerDemoWelcomeRoutes } from "./src/modules/demoWelcomeRoutes.mjs";
import { registerComunicaRoutes } from "./src/modules/comunicaRoutes.mjs";
import { registerVentasRoutes } from "./src/modules/ventasRoutes.mjs";
import { registerErpevRoutes } from "./src/modules/erpevRoutes.mjs";
import { registerEsteborgFullRoutes } from "./src/modules/esteborgFullRoutes.mjs";
import { registerIaVipComRoutes } from "./src/modules/iavipcomRoutes.mjs";
import { registerVoiceRoutes } from "./src/modules/voiceRoutes.mjs";

// ⚠️ Import de metricsRoutes eliminado
// Si algún día quieres métricas, armamos una ruta aparte.

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// CORS: puedes listar dominios en CORS_ORIGINS separados por coma
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-esteborg-tokken"],
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

// Rate limit básico para /api
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 requests por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Cliente OpenAI compartido
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --------- Registro de rutas por módulo ---------

// Generación de Tokken (igual que antes)
registerTokkenRoutes(app);

// Demo welcome
registerDemoWelcomeRoutes(app, openai);

// EsteborgCom7 – Comunicación / Liderazgo
registerComunicaRoutes(app, openai);

// Esteborg Ventas
registerVentasRoutes(app, openai);

// Esteborg ERPev
registerErpevRoutes(app, openai);

// Si usas el full-program (si no, no pasa nada si está de más)
registerEsteborgFullRoutes(app, openai);

// Esteborg IA – Despliega todo tu poder (nuevo módulo premium)
registerIaVipComRoutes(app, openai);

// Voz Esteborg (si ya lo tienes montado)
registerVoiceRoutes(app, openai);

// --------- Healthcheck & errores ---------

app.get("/healthz", (req, res) => {
  res.json({
    ok: true,
    service: "esteborg-full-backend-modular",
    modules: [
      "demoWelcome",
      "comunica",
      "ventas",
      "erpev",
      "esteborgFull",
      "iavipcom",
      "voice",
    ],
  });
});

// 404 genérico (después de TODAS las rutas)
app.use((req, res) => {
  res.status(404).json({
    error: "not_found",
    path: req.path,
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error en servidor:", err);
  res.status(500).json({
    error: "internal_error",
    message: "Tuvimos un problema en el servidor Esteborg. Intenta más tarde.",
  });
});

// Arranque
app.listen(PORT, () => {
  console.log(`🚀 Servidor Esteborg modular escuchando en puerto ${PORT}`);
});

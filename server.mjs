// server.mjs
import express from "express";
import cors from "cors";

import { openai } from "./src/config/openaiClient.mjs";

import { compressHistory } from "./src/middleware/compressHistory.mjs";
import { rateLimiter } from "./src/middleware/rateLimiter.mjs";
import { modelSelector } from "./src/middleware/modelSelector.mjs";
import { longMessageGuard } from "./src/middleware/longMessageGuard.mjs";

import { registerDemoWelcomeRoutes } from "./src/modules/demoWelcomeRoutes.mjs";
import { registerComunicaRoutes } from "./src/modules/comunicaRoutes.mjs";
import { registerVentasRoutes } from "./src/modules/ventasRoutes.mjs";
import { registerERPevRoutes } from "./src/modules/erpevRoutes.mjs";
import { registerIaVipComRoutes } from "./src/modules/iavipcomRoutes.mjs";
import { registerTokkenRoutes } from "./src/modules/tokkenRoutes.mjs";
import { registerVoiceRoutes } from "./src/modules/voiceRoutes.mjs";
import { registerEsteborgFullRoutes } from "./src/modules/esteborgFullRoutes.mjs";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Middleware base (sin inventos)
app.use(rateLimiter);
app.use(longMessageGuard);
app.use(modelSelector);
app.use(compressHistory);

// Health
app.get("/", (req, res) => res.status(200).json({ ok: true, name: "esteborg-backend-modular" }));

// Routes
registerDemoWelcomeRoutes(app, openai);
registerComunicaRoutes(app, openai);
registerVentasRoutes(app, openai);
registerERPevRoutes(app, openai);
registerIaVipComRoutes(app, openai);

registerTokkenRoutes(app); // no necesita openai
registerVoiceRoutes(app);  // si tu voice usa openai, cámbialo a (app, openai) en ambos lados
registerEsteborgFullRoutes(app, openai);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[SERVER] up on port ${PORT}`);
});

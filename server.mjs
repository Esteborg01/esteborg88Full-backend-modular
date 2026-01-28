// ===============================================
//  SERVIDOR ESTEBORG MODULAR – TITAN IMPERIAL
// ===============================================
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ====== IMPORTS DE TODOS LOS MÓDULOS ======
import { registerTokkenRoutes } from "./src/modules/tokkenRoutes.mjs";
import { registerIaVipComRoutes } from "./src/modules/iavipcomRoutes.mjs";
import { registerComunicaRoutes } from "./src/modules/comunicaRoutes.mjs";   // si lo tienes
import { registerErpevRoutes } from "./src/modules/erpevRoutes.mjs";         // si lo tienes
import { registerVentasRoutes } from "./src/modules/ventasRoutes.mjs";       // si lo tienes
import { registerDemoRoutes } from "./src/modules/demoWelcomeRoutes.mjs";    // si lo tienes

// ===============================================
//   CONFIGURACIÓN BÁSICA EXPRESS
// ===============================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ===============================================
//  LOG BÁSICO PARA DEBUG (PRODUCCIÓN SAFE)
// ===============================================
app.use((req, res, next) => {
  console.log(`➡️  ${req.method} ${req.url}`);
  next();
});

// ===============================================
// 🛠️ PATCH DE COMPATIBILIDAD (FRONTEND ANTIGUO)
// ===============================================
// Antes los frontends llamaban a /modules/<mod> directamente.
// El backend nuevo exige: /api/modules/<mod>
// Este patch reescribe rutas antiguas sin romper nada.
app.post("/modules/:mod", (req, res, next) => {
  const newUrl = `/api/modules/${req.params.mod}`;
  console.log(`🔀 [PATCH] /modules/${req.params.mod} → ${newUrl}`);
  req.url = newUrl;
  next();
});

// ===============================================
// RUTAS NUEVAS OFICIALES BAJO /api/modules/
// ===============================================
app.use("/api/modules", (req, res, next) => {
  next();
});

// Registro REAL de módulos
registerTokkenRoutes(app);
registerIaVipComRoutes(app);
registerComunicaRoutes(app);
registerErpevRoutes(app);
registerVentasRoutes(app);
registerDemoRoutes(app);

// ===============================================
// STATIC FILES (si tienes front hospedado aquí)
// ===============================================
// app.use(express.static("public"));  // si lo usas

// ===============================================
// SERVIDOR LISTO
// ===============================================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor Esteborg modular escuchando en puerto ${PORT}`);
});

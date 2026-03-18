import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// =============================
// CONFIG
// =============================

const MONGO_URI = process.env.MONGO_URI;

// =============================
// CORS
// =============================

app.use(cors({
  origin: [
    "https://esteborg.live",
    "https://membersvip.esteborg.live"
  ],
  credentials: true
}));

// =============================
// BODY PARSER
// =============================

app.use(express.json());

// =============================
// LOG REQUESTS
// =============================

app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// =============================
// IMPORTS CORRECTOS (YA EN /src)
// =============================

let authRoutes, iavipRoutes, comunicaRoutes, ventasRoutes, erpevRoutes;

try {
  authRoutes = (await import("./routes/authRoutes.mjs")).default;
  console.log("✅ authRoutes cargado");
} catch (e) {
  console.error("❌ authRoutes ERROR:", e.message);
}

try {
  iavipRoutes = (await import("./modules/iavipcom/iavipcomRoutes.mjs")).default;
  console.log("✅ iavipRoutes cargado");
} catch (e) {
  console.error("❌ iavipRoutes ERROR:", e.message);
}

try {
  comunicaRoutes = (await import("./modules/comunica/comunicaRoutes.mjs")).default;
  console.log("✅ comunicaRoutes cargado");
} catch (e) {
  console.error("❌ comunicaRoutes ERROR:", e.message);
}

try {
  ventasRoutes = (await import("./modules/ventas/ventasRoutes.mjs")).default;
  console.log("✅ ventasRoutes cargado");
} catch (e) {
  console.error("❌ ventasRoutes ERROR:", e.message);
}

try {
  erpevRoutes = (await import("./modules/erpev/erpevRoutes.mjs")).default;
  console.log("✅ erpevRoutes cargado");
} catch (e) {
  console.error("❌ erpevRoutes ERROR:", e.message);
}

// =============================
// MONTAJE DE ROUTES
// =============================

if (authRoutes) app.use("/api/auth", authRoutes);
if (iavipRoutes) app.use("/api/iavipcom", iavipRoutes);
if (comunicaRoutes) app.use("/api/comunica", comunicaRoutes);
if (ventasRoutes) app.use("/api/ventas", ventasRoutes);
if (erpevRoutes) app.use("/api/erpev", erpevRoutes);

// =============================
// DEBUG ENDPOINT
// =============================

app.get("/__debug", (req, res) => {
  res.json({
    auth: !!authRoutes,
    iavip: !!iavipRoutes,
    comunica: !!comunicaRoutes,
    ventas: !!ventasRoutes,
    erpev: !!erpevRoutes,
    time: new Date()
  });
});

// =============================
// ROOT
// =============================

app.get("/", (req, res) => {
  res.send("Esteborg backend OK 🚀");
});

// =============================
// 404
// =============================

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "route_not_found",
    path: req.originalUrl
  });
});

// =============================
// START SERVER + MONGO
// =============================

async function start() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();

    const db = client.db();
    app.locals.db = db;

    console.log("✅ Mongo conectado");

    app.listen(PORT, () => {
      console.log(`🚀 Server corriendo en puerto ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Mongo error:", err);
    process.exit(1);
  }
}

start();

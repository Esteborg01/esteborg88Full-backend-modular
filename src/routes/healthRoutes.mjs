import express from "express";
import { MongoClient } from "mongodb";

const router = express.Router();

/*
====================================================
Mongo Connection (cacheada para performance)
====================================================
*/

let cachedClient = null;

async function getMongoClient() {
  if (cachedClient) return cachedClient;

  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI environment variable is missing");
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000, // evita colgarse
    maxPoolSize: 5, // suficiente para tu carga actual
  });

  await client.connect();

  console.log("✅ MongoDB Connected (healthRoutes)");

  cachedClient = client;
  return cachedClient;
}

/*
====================================================
Health Básico (Server vivo)
====================================================
*/

router.get("/health", async (req, res) => {
  return res.status(200).json({
    ok: true,
    service: "esteborg-backend",
    time: new Date().toISOString(),
  });
});

/*
====================================================
Health Mongo (Ping real a DB)
====================================================
*/

router.get("/health/db", async (req, res) => {
  try {
    const client = await getMongoClient();

    // Ping real a Mongo
    await client.db().command({ ping: 1 });

    return res.status(200).json({
      ok: true,
      db: "mongo",
      ping: "ok",
      time: new Date().toISOString(),
    });

  } catch (err) {

    console.error("❌ Mongo Health Error:", err?.message);

    return res.status(500).json({
      ok: false,
      db: "mongo",
      error: err?.message || "unknown error",
      time: new Date().toISOString(),
    });
  }
});

export default router;

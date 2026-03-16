// src/services/aiCacheService.mjs

import crypto from "crypto";
import { MongoClient } from "mongodb";

let client;
let db;

async function getDb() {
  if (db) return db;

  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  db = client.db();

  return db;
}

function stableStringify(value) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function buildHash(payload) {
  const raw = stableStringify(payload);
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function getCacheTtlMsByModule(moduleKey) {
  const map = {
    iavipcom: 1000 * 60 * 60 * 24,
    comunica: 1000 * 60 * 60 * 24,
    ventas: 1000 * 60 * 60 * 24,
    erpev: 1000 * 60 * 60 * 24,
  };

  return map[String(moduleKey || "").toLowerCase()] || 1000 * 60 * 60 * 12;
}

export function buildAiCacheKey({
  moduleKey,
  message,
  history,
  lang,
  userName,
  plan,
}) {
  return buildHash({
    moduleKey: normalizeText(moduleKey),
    message: normalizeText(message),
    history: history || [],
    lang: normalizeText(lang || "es"),
    userName: normalizeText(userName || ""),
    plan: normalizeText(plan || "vip"),
  });
}

export async function getAiCachedReply({
  moduleKey,
  message,
  history,
  lang,
  userName,
  plan,
}) {
  const database = await getDb();
  const collection = database.collection("ai_cache");

  const cacheKey = buildAiCacheKey({
    moduleKey,
    message,
    history,
    lang,
    userName,
    plan,
  });

  const doc = await collection.findOne({
    moduleKey: String(moduleKey || "").toLowerCase(),
    cacheKey,
  });

  if (!doc) {
    return {
      hit: false,
      cacheKey,
    };
  }

  const ttlMs = getCacheTtlMsByModule(moduleKey);
  const createdAtMs = new Date(doc.createdAt).getTime();
  const expired = Date.now() - createdAtMs > ttlMs;

  if (expired) {
    return {
      hit: false,
      cacheKey,
    };
  }

  await collection.updateOne(
    { _id: doc._id },
    {
      $set: {
        lastHitAt: new Date(),
        updatedAt: new Date(),
      },
      $inc: {
        hits: 1,
      },
    }
  );

  return {
    hit: true,
    cacheKey,
    reply: doc.reply,
    meta: {
      createdAt: doc.createdAt,
      hits: (doc.hits || 0) + 1,
    },
  };
}

export async function saveAiCachedReply({
  moduleKey,
  message,
  history,
  lang,
  userName,
  plan,
  reply,
}) {
  const database = await getDb();
  const collection = database.collection("ai_cache");

  const cacheKey = buildAiCacheKey({
    moduleKey,
    message,
    history,
    lang,
    userName,
    plan,
  });

  await collection.updateOne(
    {
      moduleKey: String(moduleKey || "").toLowerCase(),
      cacheKey,
    },
    {
      $set: {
        moduleKey: String(moduleKey || "").toLowerCase(),
        cacheKey,
        messageNormalized: normalizeText(message),
        lang: normalizeText(lang || "es"),
        userName: normalizeText(userName || ""),
        plan: normalizeText(plan || "vip"),
        history: history || [],
        reply,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
        hits: 0,
      },
    },
    { upsert: true }
  );

  return {
    ok: true,
    cacheKey,
  };
}

// src/services/quotaService.mjs

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

function getMexicoDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function normalizePlan(plan) {
  return String(plan || "vip").toLowerCase().trim();
}

/*
CONTROL GLOBAL DE PROMPTS DIARIOS
---------------------------------
Todos los planes = 100 prompts por día
*/
export function getDailyQuotaByPlan(plan) {

  const normalized = normalizePlan(plan);

  const PLAN_LIMITS = {
    iavipcom: 100,
    comunica: 100,
    ventas: 100,
    erpev: 100,
    vip: 300,
    full: 100,
    esteborgfull: 300,
    admin: 999999
  };

  return PLAN_LIMITS[normalized] ?? 100;
}

export async function getTodayUsage(email) {

  const database = await getDb();
  const usage = database.collection("usage_daily");

  const dateKey = getMexicoDateKey();

  const doc = await usage.findOne({
    email: String(email || "").toLowerCase().trim(),
    dateKey
  });

  return {
    used: doc?.used ?? 0,
    dateKey,
    modules: doc?.modules || {}
  };
}

export async function canConsumeDailyQuota({ email, plan }) {

  const { used, dateKey } = await getTodayUsage(email);

  const limit = getDailyQuotaByPlan(plan);

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(limit - used, 0),
    dateKey
  };
}

export async function consumeDailyQuota({ email, plan, moduleKey }) {

  const database = await getDb();
  const usage = database.collection("usage_daily");

  const cleanEmail = String(email || "").toLowerCase().trim();
  const cleanPlan = normalizePlan(plan);
  const cleanModule = String(moduleKey || "unknown").toLowerCase().trim();

  const dateKey = getMexicoDateKey();

  const limit = getDailyQuotaByPlan(cleanPlan);

  const current = await usage.findOne({
    email: cleanEmail,
    dateKey
  });

  const used = current?.used ?? 0;

  if (used >= limit) {

    return {
      ok: false,
      allowed: false,
      limit,
      used,
      remaining: 0,
      dateKey
    };

  }

  const nextUsed = used + 1;

  await usage.updateOne(
    { email: cleanEmail, dateKey },
    {
      $setOnInsert: {
        email: cleanEmail,
        plan: cleanPlan,
        dateKey,
        createdAt: new Date()
      },

      $set: {
        plan: cleanPlan,
        updatedAt: new Date()
      },

      $inc: {
        used: 1,
        [`modules.${cleanModule}`]: 1
      }
    },
    { upsert: true }
  );

  return {
    ok: true,
    allowed: true,
    limit,
    used: nextUsed,
    remaining: Math.max(limit - nextUsed, 0),
    dateKey
  };
}

export async function getQuotaSnapshot(email, plan) {

  const { used, dateKey, modules } = await getTodayUsage(email);

  const limit = getDailyQuotaByPlan(plan);

  return {
    dateKey,
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    modules
  };
}

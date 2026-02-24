// src/utils/progressStore.mjs

import fs from "fs";
import path from "path";

const DB_PATH = path.resolve("progress-db.json");

// Cargar DB simple JSON
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}), "utf8");
  }
  const text = fs.readFileSync(DB_PATH, "utf8");
  return JSON.parse(text || "{}");
}

// Guardar DB simple JSON
function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function getUserProgress(email) {
  const db = loadDB();
  return db[email] || {};
}

export async function saveUserProgress(email, newProgress) {
  const db = loadDB();
  db[email] = {
    ...(db[email] || {}),
    ...newProgress,
  };
  saveDB(db);
}

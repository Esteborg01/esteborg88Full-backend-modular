// src/config/openaiClient.mjs
import OpenAI from "openai";
import dotenv from "dotenv";

// Para desarrollo local, carga .env
dotenv.config();

// Validación básica
if (!process.env.OPENAI_API_KEY) {
  console.error("[OpenAI] Falta la variable de entorno OPENAI_API_KEY");
  // No lanzamos error aquí para que Render arranque igual,
  // pero todas las llamadas fallarán hasta que pongas la API key.
}

// Exportación CON NOMBRE para empatar con server.mjs
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// src/config/openaiClient.mjs
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("❌ Falta OPENAI_API_KEY en variables de entorno");
}

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

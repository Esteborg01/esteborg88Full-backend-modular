// src/services/iavipcomService.mjs

import { getIaVipComSystemPrompt } from "./iavipcomBrain.mjs";
import { getUserProgress, saveUserProgress } from "../utils/progressStore.mjs";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Función principal: atender mensajes del usuario
export async function processIaVipComMessage({ message, userEmail }) {
  const systemPrompt = getIaVipComSystemPrompt();

  // Cargar progreso del usuario
  const progress = await getUserProgress(userEmail);

  // Construcción del contexto de conversación
  const conversation = [
    { role: "system", content: systemPrompt },
    { role: "assistant", content: progress.lastAssistantMessage || "" },
    { role: "user", content: message },
  ];

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: conversation,
    temperature: 0.9,
  });

  const assistantResponse = completion.choices[0].message.content;

  // Detectar eventos internos
  await handleEmbeddedEvents(assistantResponse, userEmail);

  // Guardar la última respuesta para continuidad
  await saveUserProgress(userEmail, {
    lastAssistantMessage: assistantResponse,
  });

  return assistantResponse;
}

// ======================================================
// MANEJO DE EVENTOS BACKEND
// ======================================================

async function handleEmbeddedEvents(aiText, userEmail) {
  if (!aiText) return;

  const eventRegex = /\[ESTEBORG_EVENT([^]+?)\]/g;
  let match;

  while ((match = eventRegex.exec(aiText)) !== null) {
    const payload = match[1]
      .replace("type=", '"type":')
      .replace("module=", '"module":')
      .replace("certification=", '"certification":');

    const jsonFormatted = "{" + payload + "}";

    try {
      const data = JSON.parse(jsonFormatted);

      await registerEvent(userEmail, data);
    } catch (err) {
      console.error("❌ Error parsing ESTEBORG_EVENT:", err);
    }
  }
}

// Registro básico en progreso.  
// Si mañana quieres moverlo a BD real, este diseño lo permite.
async function registerEvent(userEmail, eventData) {
  const progress = await getUserProgress(userEmail);

  if (eventData.type === "module_completed") {
    if (!progress.modulesCompleted) progress.modulesCompleted = [];

    if (!progress.modulesCompleted.includes(eventData.module)) {
      progress.modulesCompleted.push(eventData.module);
    }
  }

  if (eventData.type === "program_completed") {
    progress.certified = true;
  }

  await saveUserProgress(userEmail, progress);
}

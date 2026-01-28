// src/services/iavipcomService.mjs

import OpenAI from "openai";
import { getIaVipComSystemPrompt } from "./iavipcomBrain.mjs";
import { getUserProgress, saveUserProgress } from "../utils/progressStore.mjs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Función principal llamada desde iavipcomRoutes.mjs
 * Firma compatible con:
 *   getIaVipComReply(openai, { message, history, userName, lang, email })
 *
 * Por ahora ignoramos el objeto openai que pueda venir del server
 * y usamos nuestro propio cliente (client).
 */
export async function getIaVipComReply(_openaiIgnored, {
  message,
  history,
  userName,
  lang,
  email,
}) {
  const systemPrompt = getIaVipComSystemPrompt();

  // Cargar progreso si tenemos email
  let lastAssistantMessage = "";
  let progress = {};

  if (email) {
    progress = await getUserProgress(email);
    lastAssistantMessage = progress.lastAssistantMessage || "";
  }

  // Construimos el contexto de conversación
  const messages = [
    { role: "system", content: systemPrompt },
  ];

  // Si queremos aprovechar history del front (si la mandas)
  if (Array.isArray(history)) {
    // Se asume que history viene como [{role, content}, ...]
    history.forEach((m) => {
      if (m && m.role && m.content) {
        messages.push({ role: m.role, content: m.content });
      }
    });
  } else if (lastAssistantMessage) {
    // Fallback mínimo: última respuesta guardada
    messages.push({ role: "assistant", content: lastAssistantMessage });
  }

  // Mensaje actual del usuario
  const userContent = buildUserContent({ message, userName, lang });
  messages.push({ role: "user", content: userContent });

  // Llamada a OpenAI
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.9,
  });

  const assistantResponse = completion.choices?.[0]?.message?.content || "";

  // Manejar eventos de módulo/certificado y guardar progreso
  if (email) {
    await handleEmbeddedEvents(assistantResponse, email);

    await saveUserProgress(email, {
      ...progress,
      lastAssistantMessage: assistantResponse,
    });
  }

  return assistantResponse;
}

/**
 * Ajusta el mensaje del usuario añadiendo un poco de contexto suave
 * (sin romper nada del front).
 */
function buildUserContent({ message, userName, lang }) {
  const safeMsg = typeof message === "string" ? message : "";

  const namePart = userName ? `El usuario se llama ${userName}. ` : "";
  const langPart = lang ? `Idioma preferido: ${lang}. ` : "";

  return (
    namePart +
    langPart +
    "Mensaje del usuario para Esteborg IA: " +
    safeMsg
  );
}

// ======================================================
// MANEJO DE EVENTOS [ESTEBORG_EVENT ...]
// ======================================================

async function handleEmbeddedEvents(aiText, userEmail) {
  if (!aiText) return;

  const eventRegex = /\[ESTEBORG_EVENT([^]+?)\]/g;
  let match;

  while ((match = eventRegex.exec(aiText)) !== null) {
    const rawPayload = match[1];

    const payload = rawPayload
      .replace(/type=/g, '"type":')
      .replace(/module=/g, '"module":')
      .replace(/certification=/g, '"certification":')
      .replace(/\s+/g, " ")
      .trim();

    const jsonFormatted = `{${payload}}`;

    try {
      const data = JSON.parse(jsonFormatted);
      await registerEvent(userEmail, data);
    } catch (err) {
      console.error("❌ Error parsing ESTEBORG_EVENT:", err);
    }
  }
}

async function registerEvent(userEmail, eventData) {
  if (!userEmail || !eventData || !eventData.type) return;

  const progress = await getUserProgress(userEmail);

  if (eventData.type === "module_completed") {
    if (!progress.modulesCompleted) progress.modulesCompleted = [];

    if (
      eventData.module &&
      !progress.modulesCompleted.includes(eventData.module)
    ) {
      progress.modulesCompleted.push(eventData.module);
    }
  }

  if (eventData.type === "program_completed") {
    progress.certified = eventData.certification === "true" || true;
  }

  await saveUserProgress(userEmail, progress);
}

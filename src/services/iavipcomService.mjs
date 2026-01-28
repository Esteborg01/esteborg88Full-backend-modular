// src/services/iavipcomService.mjs
import { generateIaVipComResponse } from "../services/iavipcomBrain.mjs";

export async function iaVipComReply({ userMessage, lang, tokenData }) {
  try {
    const reply = await generateIaVipComResponse({
      userMessage,
      lang,
      tokenData,
    });

    return {
      ok: true,
      reply,
    };
  } catch (err) {
    console.error("❌ Error en iaVipComReply():", err);
    return {
      ok: false,
      reply: "Hubo un error al procesar tu mensaje. Intenta más tarde.",
    };
  }
}

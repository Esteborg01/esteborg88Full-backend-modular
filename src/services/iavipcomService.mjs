import { openai } from "../config/openaiClient.mjs";

export async function getIaVipComReply(userMessage, language) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "Eres Esteborg IA VIP." },
        { role: "user", content: userMessage }
      ]
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error en iavipcomService:", error);
    throw error;
  }
}

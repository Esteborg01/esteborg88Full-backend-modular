// src/modules/iavipcom.mjs
import express from "express";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ⚠️ El nombre de esta función debe coincidir con lo que importes en server.mjs
export function registerIaVipComRoutes(app) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      const {
        message,
        history = [],
        lang = "es",
        userName,
        // token // si decides usar token VIP por body
      } = req.body || {};

      // 🔐 Ejemplo de validación de token (si ya tienes util, descomenta y adapta)
      // const rawToken = req.headers["x-esteborg-token"] || token;
      // const isValid = await validateVipToken(rawToken);
      // if (!isValid) {
      //   return res.status(401).json({ error: "VIP token inválido" });
      // }

      const systemPrompt = `
Eres "Esteborg IA - Despliega todo tu poder", el copiloto ejecutivo oficial de Esteborg Institute.

Perfil:
- Hablas en español latino (puedes cambiar el registro a más ejecutivo o más relajado según el usuario).
- Ayudas a directores, fundadores y ejecutivos a usar IA generativa de forma estratégica.
- Conectas IA con negocio real: ventas, operaciones, liderazgo, marketing, finanzas y productividad personal.

Estilo:
- Directo, empático, práctico.
- Siempre terminas con acciones concretas (bullets o pasos).
- Cuando tenga sentido, mencionas el programa "Esteborg AI Executive & Prompt Engineer" como siguiente nivel.

Reglas:
- Pide contexto cuando la pregunta sea muy general.
- No inventes datos específicos de empresas reales; usa ejemplos genéricos o supuestos claros.
`.trim();

      const messages = [
        { role: "system", content: systemPrompt },
        ...(history || []),
        {
          role: "user",
          content: userName
            ? `Usuario: ${userName}. Mensaje: ${message}`
            : message,
        },
      ];

      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages,
        temperature: 0.7,
      });

      const reply =
        completion.choices?.[0]?.message?.content ||
        "No pude generar una respuesta en este momento. Intenta de nuevo.";

      return res.json({ reply });
    } catch (error) {
      console.error("Error en iavipcom:", error);
      return res
        .status(500)
        .json({ error: "Error interno en Esteborg IA VIP. Intenta más tarde." });
    }
  });

  // 🔚 Prefijo final de la ruta
  app.use("/api/modules/iavipcom", router);
}

// src/modules/iavipcomRoutes.mjs
import express from "express";
import { openai } from "../config/openaiClient.mjs";
import { validateTokken } from "../utils/tokken.mjs";
import { getIaVipComReply } from "../services/iavipcomService.mjs";

export const iavipcomRouter = express.Router();

// POST /api/modules/iavipcom
iavipcomRouter.post("/", async (req, res) => {
  try {
    const {
      message = "",
      history = [],
      userName = "",
      lang = "es",
      token = "",
    } = req.body;

    // Validación de tokken idéntica a la de Com7
    const { tokenStatus, tokenInfo } = validateTokken(token);

    if (tokenStatus === "invalid") {
      return res.status(401).json({
        module: "iavipcom",
        reply:
          "Tu Tokken Esteborg Members no es válido o expiró. Por favor, obtén uno nuevo en https://membersvip.esteborg.live/#miembrosvip",
        tokenStatus,
      });
    }

    // Construcción correcta del payload que pide el service
    const reply = await getIaVipComReply(openai, {
      message,
      history,
      userName,
      lang,
      token,
      tokenStatus,
      tokenInfo,
    });

    return res.status(200).json({
      module: "iavipcom",
      reply,
      tokenStatus,
      tokenInfo,
    });
  } catch (error) {
    console.error("[IAVIPCOM ERROR]", error);
    return res.status(500).json({
      module: "iavipcom",
      reply:
        "Hubo un error al procesar tu solicitud. Intenta nuevamente en unos momentos.",
    });
  }
});

import { Router } from "express";
// importa aquí lo que uses para generar el token:
// import { generateTokkenForUser } from "../services/tokkenService.mjs";

const router = Router();

router.post("/generate-token", async (req, res) => {
  try {
    const { email, personUid, accountUid } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "missing_email" });
    }

    // TODO: aquí va tu lógica real de generación:
    // const token = await generateTokkenForUser({ email, personUid, accountUid });

    const token = "TOKKEN-DE-EJEMPLO-" + Date.now(); // reemplaza con lo real

    return res.json({ token });
  } catch (err) {
    console.error("❌ Error en /generate-token:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export function registerTokkenRoutes(app) {
  // Montamos la ruta exactamente como la espera el front:
  app.use("/", router); // → POST /generate-token
}

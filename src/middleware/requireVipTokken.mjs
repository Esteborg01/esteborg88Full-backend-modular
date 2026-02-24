// requireVipTokken.mjs
import fetch from "node-fetch";

export async function requireVipTokken(req, res, next) {
  try {
    // 1️⃣ Buscar token en TODOS los lugares posibles
    const authHeader = req.headers.authorization || "";
    const token =
      authHeader.replace("Bearer ", "") ||
      req.headers["x-esteborg-token"] ||
      req.body?.tokken ||
      req.query?.tokken;

    if (!token) {
      req.esteborgMember = false;
      return next();
    }

    // 2️⃣ Validar contra Outseta
    const response = await fetch(
      "https://woowpeople.outseta.com/api/v1/tokens/validate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      }
    );

    const data = await response.json();

    // 3️⃣ Resultado
    if (data?.valid === true) {
      req.esteborgMember = true;
      req.esteborgTokken = token;
    } else {
      req.esteborgMember = false;
    }

    next();
  } catch (err) {
    console.error("❌ Error validando Tokken VIP:", err);
    req.esteborgMember = false;
    next();
  }
}

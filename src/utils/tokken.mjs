import jwt from "jsonwebtoken";

const SECRET = process.env.ESTEBORG_SECRET || "ESTEBORG_DEFAULT_SECRET";

export function validateTokken(tokken) {
  try {
    if (!tokken) {
      return { valid: false, message: "Tokken no proporcionado" };
    }

    const decoded = jwt.verify(tokken, SECRET);
    return { valid: true, decoded };
  } catch (err) {
    console.error("Error validando tokken:", err.message);
    return { valid: false, message: "Tokken inválido" };
  }
}

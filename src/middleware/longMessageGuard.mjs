// src/middleware/longMessageGuard.mjs

export function longMessageGuard(req, res, next) {
  const msg = req.body && req.body.message;

  if (!msg || typeof msg !== "string") {
    return next();
  }

  // Si el mensaje rebasa ~600 caracteres, lo recortamos y explicamos al modelo
  if (msg.length > 600) {
    const short = msg.slice(0, 250);

    req.body.message =
      "El usuario escribió un mensaje muy largo. Aquí tienes un resumen parcial para optimizar recursos: " +
      short +
      "... (el resto del texto se omitió). Responde de forma clara, breve y ejecutiva.";
  }

  next();
}

// src/middleware/compressHistory.mjs

export function compressHistoryMiddleware(req, res, next) {
  const history = req.body && req.body.history;

  if (!Array.isArray(history) || history.length <= 6) {
    return next();
  }

  // Tomamos solo los últimos 6 mensajes
  const lastSix = history.slice(-6);

  const summaryText = lastSix
    .map((m) => `${m.role}: ${m.content}`)
    .join(" | ");

  // Reemplazamos el historial por un solo mensaje comprimido
  req.body.history = [
    {
      role: "assistant",
      content:
        "Resumen breve de lo que el usuario y Esteborg han hablado hasta ahora: " +
        summaryText,
    },
  ];

  next();
}

// src/middleware/rateLimiter.mjs

const userHits = new Map();
const WINDOW_MS = 3000; // 3 segundos
const MAX_REQ = 3;      // Máximo 3 requests cada 3s por IP aproximada

export function rateLimiter(req, res, next) {
  const ipHeader = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(ipHeader) ? ipHeader[0] : (ipHeader || ""))
    .split(",")[0]
    .trim() || req.ip || "global";

  const now = Date.now();
  const hits = userHits.get(ip) || [];

  const recent = hits.filter((ts) => now - ts < WINDOW_MS);
  recent.push(now);
  userHits.set(ip, recent);

  if (recent.length > MAX_REQ) {
    return res.status(429).json({
      error: "too_many_requests",
      message:
        "Estoy procesando varias de tus respuestas. Espera un momento antes de seguir escribiendo."
    });
  }

  next();
}

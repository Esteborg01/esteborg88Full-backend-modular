// src/utils/metrics.mjs

// Pequeño helper para generar un ID sencillo por sesión (no es perfecto, pero ayuda)
function getSessionIdFromRequest(req) {
  try {
    const ipHeader = req.headers["x-forwarded-for"];
    const ip = (Array.isArray(ipHeader) ? ipHeader[0] : (ipHeader || ""))
      .split(",")[0]
      .trim() || req.ip || "unknown";

    const ua = (req.headers["user-agent"] || "").slice(0, 80);
    return Buffer.from(`${ip}|${ua}`).toString("base64");
  } catch {
    return "unknown";
  }
}

/**
 * trackEvent
 *  - name: nombre del evento (string)
 *  - data: objeto con propiedades adicionales
 *  - req: (opcional) request de Express para IP, UA, etc.
 *
 * Por ahora:
 *  - Loggea en consola en formato JSON
 *  - Futuro: aquí podemos enchufar Mixpanel, GA, etc.
 */
export function trackEvent(name, data = {}, req = null) {
  const payload = {
    event: name,
    ts: new Date().toISOString(),
    ...data,
  };

  if (req) {
    payload.sessionId = getSessionIdFromRequest(req);
    payload.ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.ip ||
      undefined;
    payload.userAgent = req.headers["user-agent"] || undefined;
  }

  // Por ahora, solo consola. Súper útil en logs de Render.
  console.log("📊 [METRICS]", JSON.stringify(payload));
}

/**
 * Helpers específicos para el demo Esteborg
 */

export function trackDemoInteraction({
  req,
  step,
  status,
  lang,
  remaining,
  userName,
}) {
  trackEvent(
    "demo_interaction",
    {
      step,
      status,               // "active" | "ended"
      lang,
      remainingInteractions: remaining,
      userName: userName || undefined,
      demoName: "esteborg_welcome",
    },
    req
  );

  // Eventos derivados
  if (step === 1) {
    trackEvent(
      "demo_started",
      { lang, demoName: "esteborg_welcome" },
      req
    );
  }

  if (remaining === 1 && status === "active") {
    trackEvent(
      "demo_penultimate",
      { lang, step, demoName: "esteborg_welcome" },
      req
    );
  }

  if (status === "ended") {
    trackEvent(
      "demo_completed",
      { lang, step, demoName: "esteborg_welcome" },
      req
    );
  }
}

export function trackDemoCtaClick({ req, target, lang }) {
  trackEvent(
    "demo_cta_click",
    {
      lang,
      target, // "esteborg_live" | "membersvip" | "both"
      demoName: "esteborg_welcome",
    },
    req
  );
}

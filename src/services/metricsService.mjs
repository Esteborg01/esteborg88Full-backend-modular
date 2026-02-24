// src/services/metricsService.mjs

// Reutilizamos el módulo genérico de métricas en utils
import {
  trackEvent,
  trackDemoInteraction,
  trackDemoCtaClick,
} from "../utils/metrics.mjs";

export { trackEvent, trackDemoInteraction, trackDemoCtaClick };

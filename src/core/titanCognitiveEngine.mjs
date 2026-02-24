// src/core/titanCognitiveEngine.mjs

export function deriveCognitiveHints({ history = [], message = "", lang = "es" } = {}) {

  const lastUser = (history || [])
    .filter(m => m?.role === "user")
    .slice(-5)
    .map(m => (m?.content || "").toLowerCase())
    .join(" ");

  const msg = (message || "").toLowerCase();
  const text = `${lastUser} ${msg}`;

  // PHASE
  let phase = "discovery";

  if (
    // ES
    text.includes("módulo") ||
    text.includes("modulo") ||
    text.includes("assessment") ||
    text.includes("evaluación") ||

    // EN
    text.includes("module") ||
    text.includes("assessment") ||
    text.includes("evaluation") ||

    // PT
    text.includes("módulo") ||
    text.includes("avaliacao") ||
    text.includes("avaliação") ||

    // FR
    text.includes("module") ||
    text.includes("évaluation") ||
    text.includes("evaluation") ||

    // IT
    text.includes("modulo") ||
    text.includes("valutazione") ||

    // DE
    text.includes("modul") ||
    text.includes("bewertung") ||
    text.includes("prüfung")
  ) {
    phase = "training";
  }

  if (
    // ES
    text.includes("implementar") ||
    text.includes("implementación") ||
    text.includes("hoy mismo") ||
    text.includes("en mi equipo") ||

    // EN
    text.includes("implement") ||
    text.includes("today") ||
    text.includes("in my team") ||

    // PT
    text.includes("implementar") ||
    text.includes("hoje") ||
    text.includes("equipe") ||

    // FR
    text.includes("implémenter") ||
    text.includes("aujourd") ||
    text.includes("équipe") ||

    // IT
    text.includes("implementare") ||
    text.includes("oggi") ||
    text.includes("team") ||

    // DE
    text.includes("implementieren") ||
    text.includes("heute") ||
    text.includes("team")
  ) {
    phase = "execution";
  }

  // MATURITY
  let maturity = "unknown";

  if (
    // ES
    text.includes("nunca he usado") ||
    text.includes("desde cero") ||
    text.includes("principiante") ||

    // EN
    text.includes("never used") ||
    text.includes("from scratch") ||
    text.includes("beginner") ||

    // PT
    text.includes("nunca usei") ||
    text.includes("do zero") ||
    text.includes("iniciante") ||

    // FR
    text.includes("jamais utilisé") ||
    text.includes("débutant") ||

    // IT
    text.includes("mai usato") ||
    text.includes("principiante") ||

    // DE
    text.includes("nie benutzt") ||
    text.includes("anfänger")
  ) {
    maturity = "beginner";
  }

  if (
    // ES
    text.includes("ya uso") ||
    text.includes("uso chatgpt") ||
    text.includes("prompts") ||
    text.includes("workflow") ||

    // EN
    text.includes("i use") ||
    text.includes("using chatgpt") ||
    text.includes("workflow") ||
    text.includes("prompt") ||

    // PT
    text.includes("já uso") ||
    text.includes("uso chatgpt") ||
    text.includes("fluxo") ||

    // FR
    text.includes("j'utilise") ||
    text.includes("workflow") ||
    text.includes("prompt") ||

    // IT
    text.includes("uso già") ||
    text.includes("workflow") ||

    // DE
    text.includes("ich nutze") ||
    text.includes("workflow")
  ) {
    maturity = "intermediate";
  }

  if (
    // ES
    text.includes("agentes") ||
    text.includes("automatización") ||
    text.includes("api") ||
    text.includes("integración") ||

    // EN
    text.includes("agents") ||
    text.includes("automation") ||
    text.includes("api") ||
    text.includes("integration") ||

    // PT
    text.includes("agentes") ||
    text.includes("automação") ||
    text.includes("api") ||
    text.includes("integração") ||

    // FR
    text.includes("agents") ||
    text.includes("automatisation") ||
    text.includes("api") ||
    text.includes("intégration") ||

    // IT
    text.includes("agenti") ||
    text.includes("automazione") ||
    text.includes("api") ||
    text.includes("integrazione") ||

    // DE
    text.includes("agenten") ||
    text.includes("automatisierung") ||
    text.includes("api") ||
    text.includes("integration")
  ) {
    maturity = "advanced";
  }

  // TOOL LEVEL
  let toolLevel = "none";
  if (text.includes("chatgpt")) toolLevel = "chatgpt";

  if (
    text.includes("copilot") ||
    text.includes("excel") ||
    text.includes("outlook") ||
    text.includes("word") ||
    text.includes("powerpoint") ||
    text.includes("teams")
  ) {
    toolLevel = "copilot";
  }

  if (text.includes("gemini")) toolLevel = "gemini";

  // RESISTANCE
  let resistance = "unknown";

  if (
    // ES
    text.includes("demasiado") ||
    text.includes("mucho texto") ||
    text.includes("muy largo") ||

    // EN
    text.includes("too much") ||
    text.includes("too long") ||

    // PT
    text.includes("muito longo") ||
    text.includes("muito texto") ||

    // FR
    text.includes("trop long") ||
    text.includes("trop de texte") ||

    // IT
    text.includes("troppo lungo") ||
    text.includes("troppo testo") ||

    // DE
    text.includes("zu lang") ||
    text.includes("zu viel text")
  ) {
    resistance = "high";
  } else if (
    text.includes("ok") ||
    text.includes("vale") ||
    text.includes("va") ||
    text.includes("dale") ||
    text.includes("go") ||
    text.includes("okey")
  ) {
    resistance = "low";
  }

  return { phase, maturity, toolLevel, resistance };
}

// (Opcional futuro) org hints global
export function deriveOrgHints({ history = [], message = "" } = {}) {
  const lastUser = (history || [])
    .filter(m => m?.role === "user")
    .slice(-6)
    .map(m => (m?.content || "").toLowerCase())
    .join(" ");

  const msg = (message || "").toLowerCase();
  const text = `${lastUser} ${msg}`;

  const strongOrgSignals = [
    // ES
    "empresa","corporativo","presupuesto","stakeholder","comité","board","kpi","okrs","proceso","aprobación","aprobacion",
    // EN
    "company","corporate","budget","committee","board","stakeholders","approval","process",
    // PT
    "empresa","corporativo","orçamento","orcamento","comitê","comite","aprovação","aprovacao",
    // FR
    "entreprise","corporatif","budget","comité","validation","processus",
    // IT
    "azienda","corporativo","budget","comitato","approvazione","processo",
    // DE
    "unternehmen","budget","gremium","genehmigung","prozess"
  ];

  const orgMode = strongOrgSignals.some(w => text.includes(w));

  return { orgMode };
}


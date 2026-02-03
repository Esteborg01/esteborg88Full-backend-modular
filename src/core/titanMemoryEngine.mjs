export function derivePsychState({ cognitiveHints, history = [], message = "" }) {

  let resistanceLevel = "medium";
  let confidenceLevel = "medium";
  let overwhelmRisk = "low";

  if (cognitiveHints.resistance === "high") {
    resistanceLevel = "high";
    overwhelmRisk = "high";
  }

  if (cognitiveHints.maturity === "beginner") {
    overwhelmRisk = "medium";
  }

  if (cognitiveHints.maturity === "advanced") {
    confidenceLevel = "high";
  }

  const shortReplies = history
    .slice(-5)
    .filter(m => m.role === "user" && m.content.length < 10).length;

  if (shortReplies >= 3) {
    resistanceLevel = "high";
    overwhelmRisk = "high";
  }

  return {
    resistanceLevel,
    confidenceLevel,
    overwhelmRisk
  };
}

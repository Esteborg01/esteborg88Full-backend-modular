export function deriveDensityProfile({ psychState }) {

  let preferredLength = "medium";

  if (psychState.overwhelmRisk === "high") {
    preferredLength = "low";
  }

  if (psychState.confidenceLevel === "high") {
    preferredLength = "high";
  }

  return { preferredLength };
}

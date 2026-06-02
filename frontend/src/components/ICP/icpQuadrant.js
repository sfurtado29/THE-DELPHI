// frontend/src/components/ICP/icpQuadrant.js
export function getICPQuadrant(icpScore, propensityScore) {
  const ICP_HIGH = 50;
  const PROP_HIGH = 50;

  const icpHigh = icpScore >= ICP_HIGH;
  const propHigh = propensityScore >= PROP_HIGH;

  if (icpHigh && propHigh) {
    return {
      quadrant: "Q1: Strategic Wins / Core Growth Engine",
      meaning: "Perfect customers, ready to buy",
      action: "Immediate sales focus / Immediate revenue",
    };
  }

  if (icpHigh && !propHigh) {
    return {
      quadrant: "Q2: Future Growth",
      meaning: "Right customers, not ready yet",
      action: "Nurture, educate",
    };
  }

  if (!icpHigh && propHigh) {
    return {
      quadrant: "Q3: Opportunistic",
      meaning: "Wrong fit but buying intent is high",
      action: "Short-term capture / Tactical wins",
    };
  }

  return {
    quadrant: "Q4: Noise / De-prioritize",
    meaning: "Poor fit, low intent",
    action: "Cost avoidance",
  };
}

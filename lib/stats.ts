// Standard normal CDF via the Abramowitz & Stegun erf approximation
// (max error ~1.5e-7, far below what conversion data can resolve).
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const poly =
    t *
    (0.254829592 +
      t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-z * z);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/**
 * One-sided confidence that A's true conversion rate exceeds B's,
 * using a pooled two-proportion z-test. Returns null when either side
 * has no traffic or both rates are identical at 0%/100% (zero variance).
 */
export function confidenceABeatsB(
  aConversions: number,
  aVisits: number,
  bConversions: number,
  bVisits: number
): number | null {
  if (aVisits === 0 || bVisits === 0) return null;
  const p1 = aConversions / aVisits;
  const p2 = bConversions / bVisits;
  const pooled = (aConversions + bConversions) / (aVisits + bVisits);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / aVisits + 1 / bVisits));
  if (se === 0) return null;
  return normalCdf((p1 - p2) / se);
}

export type ComparisonVerdict = {
  confidence: number | null;
  label: string;
  tone: "significant" | "promising" | "inconclusive" | "insufficient";
};

const MIN_VISITS_PER_VARIANT = 30;
const MIN_CONVERSIONS_TOTAL = 5;

/** Verdict for "does the leader actually beat this variant?" */
export function compareToLeader(
  leaderConversions: number,
  leaderVisits: number,
  otherConversions: number,
  otherVisits: number
): ComparisonVerdict {
  if (
    leaderVisits < MIN_VISITS_PER_VARIANT ||
    otherVisits < MIN_VISITS_PER_VARIANT ||
    leaderConversions + otherConversions < MIN_CONVERSIONS_TOTAL
  ) {
    return {
      confidence: null,
      label: "too early to judge — keep sending traffic",
      tone: "insufficient",
    };
  }

  const confidence = confidenceABeatsB(
    leaderConversions,
    leaderVisits,
    otherConversions,
    otherVisits
  );
  if (confidence === null) {
    return { confidence: null, label: "not comparable yet", tone: "insufficient" };
  }

  const pct = Math.round(confidence * 100);
  if (confidence >= 0.95) {
    return { confidence, label: `leader is better (${pct}% confidence)`, tone: "significant" };
  }
  if (confidence >= 0.9) {
    return { confidence, label: `leader looks better (${pct}%) — almost there`, tone: "promising" };
  }
  return {
    confidence,
    label: `no clear winner yet (${pct}%)`,
    tone: "inconclusive",
  };
}

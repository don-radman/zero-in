// Gravity: the status metric (never "points"). Values locked in PRD 6.3.
// Anti-farm: patches unique per event, intro gravity unique per pair, no repeatable actions.

export const GRAVITY = {
  patchClaim: 20,
  patchClaimFlagship: 30,
  introAccepted: 10, // each side
  debriefCompleted: 10,
  pulseShared: 10, // one-time optional pulse per patch
  intentRegistered: 2,
} as const;

export type Tier = "Cadet" | "Explorer" | "Voyager" | "Legend";

// Config-driven, deliberately simple. Placeholder names per PRD.
export const TIERS: { name: Tier; min: number }[] = [
  { name: "Cadet", min: 0 },
  { name: "Explorer", min: 50 },
  { name: "Voyager", min: 150 },
  { name: "Legend", min: 400 },
];

export function tierFor(gravity: number): Tier {
  let current: Tier = "Cadet";
  for (const t of TIERS) {
    if (gravity >= t.min) current = t.name;
  }
  return current;
}

export function nextTier(gravity: number): { name: Tier; needed: number } | null {
  for (const t of TIERS) {
    if (gravity < t.min) return { name: t.name, needed: t.min - gravity };
  }
  return null; // already Legend
}

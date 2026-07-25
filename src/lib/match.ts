// Matching: runs per event over the consenting cohort (claimed patch AND consent
// AND on-chain authorizeUsage granted to MATCHER_ADDR). Interests x complementarity
// x shared logistics. Max 3 active suggestions per member, 24h expiry.
// Honesty rule: this is centrally run on 0G Compute over authorized agents;
// true peer A2A negotiation is roadmap. Say it exactly this way.

export type MatchCandidate = {
  userId: string;
  building: string;
  lookingFor: string;
  logistics: Record<string, string>; // e.g. { fliesOut: "monday-evening" }
};

export type Suggestion = {
  userA: string;
  userB: string;
  reason: string; // human-readable, generated on 0G Compute
  window: string; // shared time window, e.g. "coffee at the venue cafe around 4"
};

// TODO(P1): buildPairs(cohort) -> top-K candidate pairs (cheap heuristic pre-filter)
// TODO(P1): scorePairs(pairs) -> one Router chat call per pair batch, JSON out
// TODO(P1): upsertSuggestions(eventId, suggestions) respecting the 3-active cap

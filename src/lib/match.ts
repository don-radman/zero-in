// Matching: runs per event over the consenting cohort (claimed patch AND
// consent on). Interests x complementarity x shared logistics. Max 3 active
// suggestions per member, 24h expiry.
// Honesty rule: this runs centrally on 0G Compute over authorized agents;
// true peer A2A negotiation is roadmap. Say it exactly this way.
// Pre-keys fallback: a transparent heuristic so the flow demos end to end.
import { db } from "./db";
import { routerClient, CHAT_MODEL } from "./compute";

export type CohortMember = {
  userId: string;
  name: string; // display name (email prefix or X handle)
  building: string;
  lookingFor: string;
  intentLookingFor: string | null;
  logistics: Record<string, string>;
  facts: string; // what the member taught their panda (teach-chat memories)
};

const MAX_ACTIVE_PER_MEMBER = 3;
const EXPIRY_HOURS = 24;

export async function loadCohort(eventId: string): Promise<CohortMember[]> {
  const client = db();
  const { data: rows, error } = await client
    .from("patches")
    .select("user_id, users:user_id(id, email, socials, country)")
    .eq("event_id", eventId);
  if (error) throw error;
  if (!rows?.length) return [];

  const ids = rows.map((r: any) => r.users.id);
  const [{ data: memories }, { data: intents }] = await Promise.all([
    client
      .from("memories")
      .select("user_id, kind, summary")
      .in("user_id", ids)
      .in("kind", ["profile", "taught"]),
    client
      .from("intents")
      .select("user_id, looking_for, logistics, intros_enabled")
      .eq("event_id", eventId)
      .in("user_id", ids),
  ]);

  // Consent is per-event: only members who saved an intent with intros ON.
  const consenting = rows.filter((r: any) => {
    const intent = (intents || []).find((i: any) => i.user_id === r.users.id);
    return intent && intent.intros_enabled;
  });

  return consenting.map((r: any) => {
    const mine = (memories || []).filter((m: any) => m.user_id === r.users.id);
    const profile = mine.find((m: any) => m.kind === "profile")?.summary || "";
    // Everything the member taught their panda feeds the match (last 6 facts)
    const facts = mine
      .filter((m: any) => m.kind === "taught")
      .slice(-6)
      .map((m: any) => m.summary)
      .join(" | ");
    const intent = (intents || []).find((i: any) => i.user_id === r.users.id);
    const handle = r.users.socials?.x?.replace(/^@/, "");
    return {
      userId: r.users.id,
      name: handle || r.users.email.split("@")[0],
      building: profile.match(/World: (.*?)\.$/)?.[1] || "",
      lookingFor: "",
      intentLookingFor: intent?.looking_for || null,
      logistics: intent?.logistics || {},
      facts,
    };
  });
}

type PairScore = { a: string; b: string; reason: string; window: string };

/** LLM scoring on 0G Compute: one call over the whole cohort, JSON out. */
async function scoreWithCompute(cohort: CohortMember[]): Promise<PairScore[]> {
  const client = routerClient();
  const roster = cohort.map((m) => ({
    id: m.userId,
    name: m.name,
    building: m.building,
    looking_for: m.intentLookingFor || m.lookingFor,
    about: m.facts || undefined, // taught-to-panda facts sharpen the reasons
    logistics: m.logistics,
  }));
  const res = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You match event attendees for warm intros. Pick the best pairs (complementary needs beat similarity; shared logistics like matching flight-out days are a bonus). " +
          'Reply ONLY with JSON: {"pairs":[{"a":"<id>","b":"<id>","reason":"<one specific sentence naming what each gets>","window":"<concrete suggestion like: coffee at the venue cafe around 4>"}]}. ' +
          "At most 3 pairs per person. No pair without a genuinely specific reason.",
      },
      { role: "user", content: JSON.stringify(roster) },
    ],
    response_format: { type: "json_object" } as any,
  });
  const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
  return Array.isArray(parsed.pairs) ? parsed.pairs : [];
}

/** Heuristic fallback: token overlap between what A seeks and B builds. */
function scoreHeuristic(cohort: CohortMember[]): PairScore[] {
  const tokens = (s: string) =>
    new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3));
  const pairs: (PairScore & { score: number })[] = [];
  for (let i = 0; i < cohort.length; i++) {
    for (let j = i + 1; j < cohort.length; j++) {
      const A = cohort[i];
      const B = cohort[j];
      const aSeeks = tokens(`${A.intentLookingFor || A.lookingFor}`);
      const bSeeks = tokens(`${B.intentLookingFor || B.lookingFor}`);
      const aBuilds = tokens(`${A.building} ${A.facts}`);
      const bBuilds = tokens(`${B.building} ${B.facts}`);
      let score =
        [...aSeeks].filter((t) => bBuilds.has(t)).length * 2 +
        [...bSeeks].filter((t) => aBuilds.has(t)).length * 2 +
        [...aBuilds].filter((t) => bBuilds.has(t)).length;
      const sharedOut = A.logistics.flies_out && A.logistics.flies_out === B.logistics.flies_out;
      if (sharedOut) score += 2;
      if (score < 2) continue;
      pairs.push({
        a: A.userId,
        b: B.userId,
        score,
        reason: `${A.name} is after ${A.intentLookingFor || A.lookingFor}; ${B.name} is building ${B.building}.`,
        window: sharedOut
          ? `You both fly out ${A.logistics.flies_out}. Coffee before you go?`
          : "Coffee at the venue cafe?",
      });
    }
  }
  return pairs.sort((x, y) => y.score - x.score);
}

/** Run matching for an event; inserts new suggestions respecting caps. */
export async function runMatch(eventId: string): Promise<{ created: number; cohort: number }> {
  const client = db();
  const cohort = await loadCohort(eventId);
  if (cohort.length < 2) return { created: 0, cohort: cohort.length };

  let scored: PairScore[];
  if (process.env.ROUTER_API_KEY) {
    try {
      scored = await scoreWithCompute(cohort);
    } catch (e) {
      console.error("[match] compute scoring failed, using heuristic:", e instanceof Error ? e.message : e);
      scored = scoreHeuristic(cohort);
    }
  } else {
    scored = scoreHeuristic(cohort);
  }

  const { data: existing } = await client
    .from("suggestions")
    .select("user_a, user_b, status")
    .eq("event_id", eventId);
  const seen = new Set((existing || []).map((s: any) => [s.user_a, s.user_b].sort().join("|")));
  const activeCount = new Map<string, number>();
  for (const s of existing || []) {
    if (["pending", "a_yes", "b_yes"].includes(s.status)) {
      activeCount.set(s.user_a, (activeCount.get(s.user_a) || 0) + 1);
      activeCount.set(s.user_b, (activeCount.get(s.user_b) || 0) + 1);
    }
  }

  const ids = new Set(cohort.map((c) => c.userId));
  let created = 0;
  for (const p of scored) {
    if (!ids.has(p.a) || !ids.has(p.b) || p.a === p.b) continue;
    const key = [p.a, p.b].sort().join("|");
    if (seen.has(key)) continue;
    if ((activeCount.get(p.a) || 0) >= MAX_ACTIVE_PER_MEMBER) continue;
    if ((activeCount.get(p.b) || 0) >= MAX_ACTIVE_PER_MEMBER) continue;

    const { error } = await client.from("suggestions").insert({
      event_id: eventId,
      user_a: p.a,
      user_b: p.b,
      reason: p.reason,
      time_window: p.window,
      expires_at: new Date(Date.now() + EXPIRY_HOURS * 3600_000).toISOString(),
    });
    if (!error) {
      created++;
      seen.add(key);
      activeCount.set(p.a, (activeCount.get(p.a) || 0) + 1);
      activeCount.set(p.b, (activeCount.get(p.b) || 0) + 1);
    }
  }
  return { created, cohort: cohort.length };
}

/** Intro message on double opt-in, attributed to the initiating panda. */
export async function generateIntro(params: {
  initiatorName: string;
  otherName: string;
  reason: string;
  window: string;
}): Promise<string> {
  const fallback = `${params.initiatorName}'s panda thought you two should connect: ${params.reason} ${params.window}`;
  if (!process.env.ROUTER_API_KEY) return fallback;
  try {
    const client = routerClient();
    const res = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Write a two-sentence warm intro between two event attendees. Attribute it to the first person's panda (their AI agent). " +
            "Sentence 1: why they should meet, specific. Sentence 2: the concrete time/place suggestion. Friendly, zero corporate fluff, no emojis.",
        },
        {
          role: "user",
          content: `Initiator: ${params.initiatorName}. Other: ${params.otherName}. Reason: ${params.reason}. Window: ${params.window}`,
        },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

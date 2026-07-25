// Upgrade template-generated reasons on PENDING suggestions to LLM-written
// ones (0G Compute). Cards already accepted/matched are never touched.
// Run when the router rate window is clear: npx tsx scripts/polish-reasons.ts <eventId>
import "dotenv/config";
import { db } from "../src/lib/db";
import { loadCohort } from "../src/lib/match";
import { routerClient, CHAT_MODEL } from "../src/lib/compute";

async function main() {
  const eventId = process.argv[2];
  if (!eventId) {
    console.error("Usage: npx tsx scripts/polish-reasons.ts <eventId>");
    process.exit(1);
  }
  const client = db();
  const cohort = await loadCohort(eventId);
  const byId = new Map(cohort.map((m) => [m.userId, m]));

  const { data: pending } = await client
    .from("suggestions")
    .select("id, user_a, user_b, reason, time_window, status")
    .eq("event_id", eventId)
    .in("status", ["pending"]);
  if (!pending?.length) {
    console.log("no pending suggestions to polish");
    return;
  }

  const router = routerClient();
  let polished = 0;
  for (const s of pending) {
    const A = byId.get(s.user_a);
    const B = byId.get(s.user_b);
    if (!A || !B) continue;
    try {
      const res = await router.chat.completions.create({
        model: CHAT_MODEL,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            content:
              "Write ONE warm, specific sentence explaining why these two event attendees should meet, naming what each gets. No emojis, no fluff, under 30 words. Never invent facts not given.",
          },
          {
            role: "user",
            content: JSON.stringify({
              personA: { name: A.name, world: A.building, seeks: A.intentLookingFor, about: A.facts, logistics: A.logistics },
              personB: { name: B.name, world: B.building, seeks: B.intentLookingFor, about: B.facts, logistics: B.logistics },
            }),
          },
        ],
      });
      const reason = res.choices[0]?.message?.content?.trim();
      if (reason && reason.length > 20) {
        await client.from("suggestions").update({ reason }).eq("id", s.id).eq("status", "pending");
        polished++;
        console.log(`polished: ${reason.slice(0, 90)}...`);
      }
      await new Promise((r) => setTimeout(r, 3000)); // stay under the rate limit
    } catch (e) {
      console.warn("skip (likely rate limit):", e instanceof Error ? e.message.slice(0, 80) : e);
      await new Promise((r) => setTimeout(r, 15000));
    }
  }
  console.log(`done: ${polished}/${pending.length} reasons upgraded`);
}

main().catch((e) => { console.error(e); process.exit(1); });

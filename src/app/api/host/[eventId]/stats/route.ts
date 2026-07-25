// GET /api/host/[eventId]/stats: issuer aggregates ONLY. Never individual
// answers. Ask-the-Room synthesis gated behind minimum cohort of 5.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routerClient, CHAT_MODEL } from "@/lib/compute";

const MIN_COHORT = 5;

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const client = db();

    const { data: event } = await client.from("events").select("*").eq("id", eventId).maybeSingle();
    if (!event) return NextResponse.json({ error: "no such event" }, { status: 404 });

    const { data: patches } = await client
      .from("patches")
      .select("user_id, edition, emoji_pulse, debrief_done, claimed_at, pulse")
      .eq("event_id", eventId);
    const cohort = patches || [];
    const userIds = cohort.map((p) => p.user_id);

    // First-timers: this event is their first patch ever
    let firstTimers = 0;
    if (userIds.length) {
      const { data: allPatches } = await client
        .from("patches")
        .select("user_id, event_id")
        .in("user_id", userIds);
      const counts = new Map<string, number>();
      for (const p of allPatches || []) counts.set(p.user_id, (counts.get(p.user_id) || 0) + 1);
      firstTimers = userIds.filter((id) => (counts.get(id) || 0) === 1).length;
    }

    const { data: suggestions } = await client.from("suggestions").select("status").eq("event_id", eventId);
    const intros = {
      created: (suggestions || []).length,
      matched: (suggestions || []).filter((s) => s.status === "matched").length,
    };

    const emojis: Record<string, number> = {};
    for (const p of cohort) if (p.emoji_pulse) emojis[p.emoji_pulse] = (emojis[p.emoji_pulse] || 0) + 1;

    // Pulse aggregates (vibes histogram, connections rate, improvement list)
    const pulses = cohort.map((p: any) => p.pulse).filter(Boolean);
    const vibeCounts: Record<string, number> = {};
    let connectionsYes = 0;
    const improvements: string[] = [];
    for (const p of pulses) {
      for (const v of [...(p.vibes || []), p.vibeOther].filter(Boolean)) {
        vibeCounts[v] = (vibeCounts[v] || 0) + 1;
      }
      if (p.madeConnections) connectionsYes++;
      if (p.improvement) improvements.push(p.improvement);
    }

    // Ask-the-Room synthesis (0G Compute), only above the privacy floor
    let askTheRoom: { question: string | null; summary: string | null; answers: number } = {
      question: event.ask_the_room,
      summary: null,
      answers: 0,
    };
    if (event.ask_the_room && userIds.length) {
      const { data: answers } = await client
        .from("memories")
        .select("summary")
        .eq("kind", "ask_room")
        .in("user_id", userIds);
      askTheRoom.answers = (answers || []).length;
      if (askTheRoom.answers >= MIN_COHORT && process.env.ROUTER_API_KEY) {
        try {
          const res = await routerClient().chat.completions.create({
            model: CHAT_MODEL,
            messages: [
              {
                role: "system",
                content:
                  "Synthesize event attendees' answers into themes for the organizer. 3-4 bullet themes with rough counts, one 'notable ask' line. Aggregate only, never quote an answer in a way that identifies someone.",
              },
              { role: "user", content: `Question: ${event.ask_the_room}\nAnswers:\n${(answers || []).map((a: any) => `- ${a.summary}`).join("\n")}` },
            ],
          });
          askTheRoom.summary = res.choices[0]?.message?.content?.trim() || null;
        } catch (e) {
          console.error("[stats] ask-the-room synthesis failed:", e instanceof Error ? e.message : e);
        }
      }
    }

    return NextResponse.json({
      event: { name: event.name, cap: event.cap, startsAt: event.starts_at, endsAt: event.ends_at },
      claims: cohort.length,
      firstTimers,
      intros,
      debriefsDone: cohort.filter((p) => p.debrief_done).length,
      emojis,
      pulse: {
        shared: pulses.length,
        vibes: vibeCounts,
        connectionsYes,
        // free text stays behind the privacy floor
        improvements: pulses.length >= MIN_COHORT ? improvements : [],
      },
      askTheRoom,
      minCohort: MIN_COHORT,
    });
  } catch (e) {
    console.error("[stats]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

// The Debrief: agent-led next-morning follow-up (demo mode: DEBRIEF_DELAY=120s).
// GET  /api/debrief -> eligible patches (claimed > DEBRIEF_DELAY ago, not done)
// POST /api/debrief { eventId, answers: string[] } -> patch upgrade + gravity
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/privy";
import { db, addGravity } from "@/lib/db";
import { GRAVITY } from "@/lib/gravity";

const QUESTIONS = [
  "What stuck with you from today?",
  "Did you meet anyone you want to follow up with?",
  "One thing that would make the next one better?",
];

export async function GET(req: Request) {
  try {
    const auth = await verifyAuth(req);
    const client = db();
    const { data: user } = await client.from("users").select("id").eq("email", auth.email).maybeSingle();
    if (!user) return NextResponse.json({ eligible: [] });

    const delaySec = Number(process.env.DEBRIEF_DELAY || 120);
    const cutoff = new Date(Date.now() - delaySec * 1000).toISOString();

    const { data } = await client
      .from("patches")
      .select("event_id, edition, claimed_at, events:event_id(name)")
      .eq("user_id", user.id)
      .eq("debrief_done", false)
      .lt("claimed_at", cutoff);

    return NextResponse.json({
      eligible: (data || []).map((p: any) => ({ eventId: p.event_id, eventName: p.events?.name, edition: p.edition })),
      questions: QUESTIONS,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req);
    const { eventId, answers } = await req.json();
    if (!eventId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "eventId and answers[] required" }, { status: 400 });
    }
    const client = db();
    const { data: user } = await client.from("users").select("id").eq("email", auth.email).maybeSingle();
    if (!user) return NextResponse.json({ error: "unknown user" }, { status: 404 });

    const { data: patch } = await client
      .from("patches")
      .select("debrief_done, events:event_id(name)")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!patch) return NextResponse.json({ error: "no patch for this event" }, { status: 404 });
    if (patch.debrief_done) return NextResponse.json({ error: "debrief already done" }, { status: 409 });

    await client.from("patches").update({ debrief_done: true }).eq("event_id", eventId).eq("user_id", user.id);

    const eventName = (patch as any).events?.name || "the event";
    for (let i = 0; i < Math.min(answers.length, QUESTIONS.length); i++) {
      if (!answers[i]?.trim()) continue;
      await client.from("memories").insert({
        user_id: user.id,
        kind: "debrief",
        summary: `${eventName}: ${QUESTIONS[i]} -> ${answers[i].trim()}`,
      });
    }

    const { gravity, tier } = await addGravity(user.id, GRAVITY.debriefCompleted);
    return NextResponse.json({ done: true, gravity, tier, patchUpgraded: true });
  } catch (e) {
    console.error("[debrief]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

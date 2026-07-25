// POST /api/pulse: the optional one-time event pulse (+10 gravity).
// { eventId, vibes: string[], vibeOther?, madeConnections: boolean, improvement? }
// Answers are aggregate-only for the host; stored on the member's patch row.
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/privy";
import { db, addGravity } from "@/lib/db";
import { GRAVITY } from "@/lib/gravity";

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req);
    const { eventId, vibes, vibeOther, madeConnections, improvement } = await req.json();
    if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

    const client = db();
    const { data: user } = await client.from("users").select("id").eq("email", auth.email).maybeSingle();
    if (!user) return NextResponse.json({ error: "onboard first" }, { status: 404 });

    const { data: patch } = await client
      .from("patches")
      .select("pulse, events:event_id(name)")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!patch) return NextResponse.json({ error: "no patch for this event" }, { status: 404 });
    if (patch.pulse) return NextResponse.json({ error: "pulse already shared" }, { status: 409 });

    const pulse = {
      vibes: Array.isArray(vibes) ? vibes.slice(0, 8) : [],
      vibeOther: typeof vibeOther === "string" && vibeOther.trim() ? vibeOther.trim().slice(0, 40) : undefined,
      madeConnections: !!madeConnections,
      improvement: typeof improvement === "string" && improvement.trim() ? improvement.trim().slice(0, 240) : undefined,
      at: new Date().toISOString(),
    };

    const { error } = await client
      .from("patches")
      .update({ pulse })
      .eq("event_id", eventId)
      .eq("user_id", user.id);
    if (error) throw error;

    const eventName = (patch as any).events?.name || "the event";
    await client.from("memories").insert({
      user_id: user.id,
      kind: "pulse",
      summary: `${eventName} pulse: ${[...pulse.vibes, pulse.vibeOther].filter(Boolean).join(", ") || "no vibes picked"}; ${pulse.madeConnections ? "made new connections" : "no new connections yet"}${pulse.improvement ? `; suggestion: ${pulse.improvement}` : ""}`,
    });

    const { gravity, tier } = await addGravity(user.id, GRAVITY.pulseShared);
    return NextResponse.json({ gravity, tier, gained: GRAVITY.pulseShared });
  } catch (e) {
    console.error("[pulse]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

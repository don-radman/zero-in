// GET /api/events/[id]: public event info for the claim page (no claim key).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: event } = await db()
    .from("events")
    .select("id, name, starts_at, ends_at, cap, ask_the_room, trust_tier, flagship")
    .eq("id", id)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: "no such event" }, { status: 404 });

  const { count } = await db().from("patches").select("*", { count: "exact", head: true }).eq("event_id", id);
  return NextResponse.json({ event, claimed: count ?? 0 });
}

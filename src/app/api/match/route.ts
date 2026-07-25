// POST /api/match { eventId }: trigger a match run over the consenting cohort.
// Called from the host dashboard (demo control) and lazily by /api/suggestions.
import { NextResponse } from "next/server";
import { runMatch } from "@/lib/match";

export async function POST(req: Request) {
  try {
    const { eventId } = await req.json();
    if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });
    const result = await runMatch(eventId);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[match]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "match failed" }, { status: 500 });
  }
}

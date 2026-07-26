// POST /api/suggestions/[id]/respond { accept: boolean }
// Double opt-in: second yes generates the intro (0G Compute), pays +10 gravity
// to each side, and writes the meeting into both agents' memories.
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/privy";
import { db, addGravity } from "@/lib/db";
import { generateIntro } from "@/lib/match";
import { GRAVITY } from "@/lib/gravity";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(req);
    const { id } = await params;
    const { accept } = await req.json();
    const client = db();

    const { data: user } = await client.from("users").select("id, email, socials").eq("email", auth.email).maybeSingle();
    if (!user) return NextResponse.json({ error: "unknown user" }, { status: 404 });

    const { data: s } = await client.from("suggestions").select("*").eq("id", id).maybeSingle();
    if (!s) return NextResponse.json({ error: "no such suggestion" }, { status: 404 });
    if (s.user_a !== user.id && s.user_b !== user.id) return NextResponse.json({ error: "not yours" }, { status: 403 });
    if (s.status === "matched" || s.status === "expired") {
      return NextResponse.json({ error: `already ${s.status}` }, { status: 409 });
    }

    if (!accept) {
      // Silent pass: card expires for both; "your panda keeps looking."
      await client.from("suggestions").update({ status: "expired" }).eq("id", id);
      return NextResponse.json({ status: "expired" });
    }

    const mySide = s.user_a === user.id ? "a" : "b";
    const otherAccepted = s.status === (mySide === "a" ? "b_yes" : "a_yes");

    if (!otherAccepted) {
      await client.from("suggestions").update({ status: `${mySide}_yes` }).eq("id", id);
      return NextResponse.json({ status: `${mySide}_yes`, waiting: true });
    }

    // Both yes: the intro moment. Initiator = whoever said yes FIRST (the other side).
    const initiatorId = mySide === "a" ? s.user_b : s.user_a;
    const otherId = initiatorId === s.user_a ? s.user_b : s.user_a;
    const { data: people } = await client.from("users").select("id, email, socials").in("id", [initiatorId, otherId]);
    const nameOf = (uid: string) => {
      const p = (people || []).find((x: any) => x.id === uid);
      return (
        p?.socials?.telegram?.replace(/^@/, "") ||
        p?.socials?.x?.replace(/^@/, "") ||
        p?.email?.split("@")[0] ||
        "someone"
      );
    };

    const introMessage = await generateIntro({
      initiatorName: nameOf(initiatorId),
      otherName: nameOf(otherId),
      reason: s.reason,
      window: s.time_window || "Coffee at the venue cafe?",
    });

    await client.from("suggestions").update({ status: "matched", intro_message: introMessage }).eq("id", id);

    for (const uid of [s.user_a, s.user_b]) {
      await addGravity(uid, GRAVITY.introAccepted);
      const otherName = nameOf(uid === s.user_a ? s.user_b : s.user_a);
      await client.from("memories").insert({
        user_id: uid,
        kind: "met",
        summary: `Matched with ${otherName}: ${s.reason}`,
      });
    }

    return NextResponse.json({ status: "matched", introMessage });
  } catch (e) {
    console.error("[respond]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

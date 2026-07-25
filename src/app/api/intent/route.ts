// POST /api/intent: register what you are looking for at THIS event, plus
// logistics and the issuer's Ask-the-Room answer. The answer itself never
// lands in the DB in plaintext beyond an answered flag; it belongs to the
// member's encrypted memory. Registering intent earns +2 gravity (once).
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/privy";
import { db, addGravity } from "@/lib/db";
import { GRAVITY } from "@/lib/gravity";

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req);
    const { eventId, lookingFor, logistics, askRoomAnswer, introsEnabled, telegram, contactEmail } = await req.json();
    if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

    const client = db();
    const { data: user } = await client.from("users").select("id, socials").eq("email", auth.email).maybeSingle();
    if (!user) return NextResponse.json({ error: "onboard first", code: "NEEDS_ONBOARD" }, { status: 409 });

    // Reachable channels ride in with the intent (Telegram preferred, email
    // fallback; login email is the final fallback at intro time)
    const socialUpdates: Record<string, string> = {};
    if (telegram && typeof telegram === "string" && telegram.trim()) {
      socialUpdates.telegram = telegram.trim().replace(/^@/, "");
    }
    if (contactEmail && typeof contactEmail === "string" && contactEmail.includes("@")) {
      socialUpdates.contact_email = contactEmail.trim();
    }
    if (Object.keys(socialUpdates).length > 0) {
      await client
        .from("users")
        .update({ socials: { ...(user.socials || {}), ...socialUpdates } })
        .eq("id", user.id);
    }

    const { data: existing } = await client
      .from("intents")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("event_id", eventId)
      .maybeSingle();

    const { error } = await client.from("intents").upsert({
      user_id: user.id,
      event_id: eventId,
      looking_for: lookingFor || null,
      logistics: logistics || {},
      ask_room_answered: !!askRoomAnswer,
      intros_enabled: introsEnabled === false ? false : true,
    });
    if (error) throw error;

    // Ask-the-Room answer goes to the member's memory mirror (encrypted ring),
    // never to the issuer as an individual answer.
    if (askRoomAnswer) {
      await client.from("memories").insert({
        user_id: user.id,
        kind: "ask_room",
        summary: askRoomAnswer,
      });
    }

    let gravity = null;
    if (!existing) gravity = await addGravity(user.id, GRAVITY.intentRegistered);

    return NextResponse.json({ ok: true, gravity });
  } catch (e) {
    console.error("[intent]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

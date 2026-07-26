// GET /api/suggestions: my active suggestion cards (both sides), lazily
// triggering a match run for my most recent event when I have none.
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/privy";
import { db } from "@/lib/db";
import { runMatch } from "@/lib/match";

export async function GET(req: Request) {
  try {
    const auth = await verifyAuth(req);
    const client = db();
    const { data: user } = await client.from("users").select("id, email").eq("email", auth.email).maybeSingle();
    if (!user) return NextResponse.json({ suggestions: [] });

    async function fetchMine() {
      const { data } = await client
        .from("suggestions")
        .select("*, eventInfo:event_id(name)")
        .or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`)
        .in("status", ["pending", "a_yes", "b_yes", "matched"])
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      return data || [];
    }

    let mine = await fetchMine();

    // Lazy match run: nothing active -> try my latest claimed event
    if (mine.filter((s: any) => s.status !== "matched").length === 0) {
      const { data: lastPatch } = await client
        .from("patches")
        .select("event_id")
        .eq("user_id", user.id)
        .order("claimed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastPatch) {
        await runMatch(lastPatch.event_id).catch(() => {});
        mine = await fetchMine();
      }
    }

    // Decorate with the other member's public-safe info + my side
    const otherIds = mine.map((s: any) => (s.user_a === user.id ? s.user_b : s.user_a));
    const { data: others } = otherIds.length
      ? await client.from("users").select("id, email, country, socials").in("id", otherIds)
      : { data: [] };
    const { data: profiles } = otherIds.length
      ? await client.from("memories").select("user_id, summary").eq("kind", "profile").in("user_id", otherIds)
      : { data: [] };

    const cards = mine.map((s: any) => {
      const otherId = s.user_a === user.id ? s.user_b : s.user_a;
      const other = (others || []).find((o: any) => o.id === otherId);
      const profile = (profiles || []).find((p: any) => p.user_id === otherId)?.summary;
      const mySide = s.user_a === user.id ? "a" : "b";
      const iAccepted = s.status === "matched" || s.status === `${mySide}_yes`;
      // Contact revealed only on a double yes: Telegram preferred, then their
      // chosen contact email, then their login email as final fallback.
      const contact =
        s.status === "matched"
          ? other?.socials?.telegram
            ? { type: "telegram", value: other.socials.telegram.replace(/^@/, "") }
            : other?.socials?.contact_email
            ? { type: "email", value: other.socials.contact_email }
            : { type: "email", value: other?.email }
          : undefined;
      return {
        id: s.id,
        event: s.eventInfo?.name,
        status: s.status,
        iAccepted,
        reason: s.reason,
        window: s.time_window,
        introMessage: s.status === "matched" ? s.intro_message : null,
        other: {
          name:
            other?.socials?.telegram?.replace(/^@/, "") ||
            other?.socials?.x?.replace(/^@/, "") ||
            other?.email?.split("@")[0] ||
            "someone",
          country: other?.country,
          profile,
          socials: s.status === "matched" ? other?.socials : undefined, // socials only after both say yes
          contact,
        },
      };
    });

    return NextResponse.json({ suggestions: cards });
  } catch (e) {
    console.error("[suggestions]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

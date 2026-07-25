// GET /api/me: everything the profile screen needs: user, agent, patches with
// event names, gravity/tier, and the memory mirror ("what my panda knows").
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/privy";
import { db } from "@/lib/db";
import { nextTier } from "@/lib/gravity";

export async function GET(req: Request) {
  try {
    const auth = await verifyAuth(req);
    const client = db();

    const { data: user } = await client.from("users").select("*").eq("email", auth.email).maybeSingle();
    if (!user) return NextResponse.json({ error: "onboard first", code: "NEEDS_ONBOARD" }, { status: 404 });

    const [{ data: agent }, { data: patches }, { data: memories }] = await Promise.all([
      client.from("agents").select("*").eq("user_id", user.id).maybeSingle(),
      client
        .from("patches")
        .select("edition, claimed_at, tx_hash, events:event_id(name, cap, trust_tier)")
        .eq("user_id", user.id)
        .order("claimed_at", { ascending: false }),
      client.from("memories").select("id, kind, summary, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      user: { email: user.email, country: user.country, wallet: user.wallet, consentScope: user.consent_scope },
      agent,
      patches: patches || [],
      memories: memories || [],
      nextTier: agent ? nextTier(agent.gravity) : null,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

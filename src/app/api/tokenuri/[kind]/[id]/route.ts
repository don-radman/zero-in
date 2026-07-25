// GET /api/tokenuri/agent/[tokenId] and /api/tokenuri/patch/[eventUuid]
// NFT metadata JSON. Agent metadata exposes only public facts (tier, gravity,
// patch count); everything personal stays encrypted (hashes on-chain).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const client = db();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    if (kind === "agent") {
      const { data: agent } = await client.from("agents").select("*, users:user_id(country)").eq("token_id", Number(id)).maybeSingle();
      if (!agent) return NextResponse.json({ error: "unknown token" }, { status: 404 });
      const { count } = await client.from("patches").select("*", { count: "exact", head: true }).eq("user_id", agent.user_id);
      return NextResponse.json({
        name: `Zero-In Panda #${id}`,
        description:
          "An Agentic ID (ERC-7857) on 0G. This panda learns privately: its memory lives encrypted on 0G Storage, only hashes on-chain.",
        image: agent.panda_image_url?.startsWith("data:") ? agent.panda_image_url : `${appUrl}/api/panda/${id}.png`,
        attributes: [
          { trait_type: "Tier", value: agent.tier },
          { trait_type: "Gravity", value: agent.gravity },
          { trait_type: "Patches", value: count ?? 0 },
          { trait_type: "Country", value: agent.users?.country || "??" },
        ],
      });
    }

    if (kind === "patch") {
      const { data: event } = await client.from("events").select("*").eq("id", id).maybeSingle();
      if (!event) return NextResponse.json({ error: "unknown event" }, { status: 404 });
      const { count } = await client.from("patches").select("*", { count: "exact", head: true }).eq("event_id", id);
      return NextResponse.json({
        name: `${event.name} Patch`,
        description: `Mission patch for ${event.name}. ${count ?? 0} claimed${event.cap ? ` of ${event.cap}` : ""}. Attestation: ${event.trust_tier}.`,
        image: event.patch_art_url || `${appUrl}/patch-default.svg`,
        attributes: [
          { trait_type: "Attestation", value: event.trust_tier },
          { trait_type: "Claimed", value: count ?? 0 },
        ],
      });
    }

    return NextResponse.json({ error: "kind must be agent or patch" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

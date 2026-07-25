// GET /api/agent-card/[tokenId]: ERC-8004 registration file (agent card).
// Registered in the Identity Registry by scripts/register8004.ts; shows up on
// 8004scan. Public facts only.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AGENT_CONTRACT, zgGalileo } from "@/lib/chain";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = db();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { data: agent } = await client.from("agents").select("tier, gravity").eq("token_id", Number(id)).maybeSingle();
  if (!agent) return NextResponse.json({ error: "unknown token" }, { status: 404 });

  return NextResponse.json({
    type: "https://eips.ethereum.org/EIPS/eip-8004",
    name: `Zero-In Panda #${id}`,
    description:
      "Personal presence agent on Zero-In (the presence layer for communities, built on 0G). " +
      "Learns privately from events its member attends; memory encrypted on 0G Storage, hashes on-chain (ERC-7857). " +
      "Matches members via double-opt-in intros computed on 0G Compute.",
    image: `${appUrl}/api/tokenuri/agent/${id}`,
    url: appUrl,
    registrations: [
      {
        agentId: null, // filled after register8004.ts runs
        agentAddress: `eip155:${zgGalileo.id}:${AGENT_CONTRACT || "TBD"}`,
        tokenId: id,
      },
    ],
    skills: [
      { id: "presence.match", name: "Warm intros", description: "Double-opt-in introductions with a reason and a shared time window" },
      { id: "presence.memory", name: "Event memory", description: "Private who-did-I-meet recall for its member" },
    ],
    trustModels: ["reputation"],
    active: true,
  });
}

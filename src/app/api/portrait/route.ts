// POST /api/portrait: the retryable half of onboarding. Generates (or
// regenerates) the photoreal portrait for the caller's agent and backfills a
// missed mint. Safe to call any number of times: it only upgrades, never
// downgrades, and never double-mints.
import { NextResponse } from "next/server";
import { keccak256, toBytes, parseEventLogs } from "viem";
import { verifyAuth } from "@/lib/privy";
import { db } from "@/lib/db";
import { generatePanda, PandaTraits } from "@/lib/panda";
import { AGENT_CONTRACT, relayerWrite, publicClient, explorerTx } from "@/lib/chain";
import { agentAbi } from "@/lib/abi";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req);
    const client = db();

    const { data: user } = await client.from("users").select("*").eq("email", auth.email).maybeSingle();
    if (!user) return NextResponse.json({ error: "onboard first" }, { status: 404 });
    const { data: agent } = await client.from("agents").select("*").eq("user_id", user.id).maybeSingle();
    if (!agent) return NextResponse.json({ error: "onboard first" }, { status: 404 });

    // Heal a deferred mint first (cheap when already done)
    let mintTx: string | null = agent.mint_tx;
    let tokenId: number | null = agent.token_id;
    if (tokenId === null && AGENT_CONTRACT && user.wallet && process.env.RELAYER_KEYS) {
      try {
        const profileJson = JSON.stringify({ country: user.country, socials: user.socials || {} });
        const datas = [
          { dataDescription: "profile_v1", dataHash: keccak256(toBytes(profileJson)) },
          { dataDescription: "memory_root", dataHash: keccak256(toBytes(`genesis:${user.id}`)) },
        ];
        const { hash } = await relayerWrite({
          address: AGENT_CONTRACT,
          abi: agentAbi,
          functionName: "iMintWithRole",
          args: [user.wallet as `0x${string}`, datas, user.wallet as `0x${string}`],
        });
        mintTx = hash;
        const receipt = await publicClient.getTransactionReceipt({ hash });
        const transfers = parseEventLogs({ abi: agentAbi, logs: receipt.logs, eventName: "Transfer" });
        const tid = transfers[0]?.args?.tokenId;
        tokenId = tid !== undefined ? Number(tid) : null;
        await client.from("agents").update({ token_id: tokenId, mint_tx: mintTx }).eq("user_id", user.id);
      } catch (e) {
        console.error("[portrait] mint backfill failed (will heal next call):", e instanceof Error ? e.message : e);
      }
    }

    // Already photoreal? Nothing to do.
    if (!agent.panda_fallback) {
      return NextResponse.json({
        upgraded: false,
        alreadyPhotoreal: true,
        mint: mintTx ? { tx: mintTx, explorer: explorerTx(mintTx), tokenId: tokenId?.toString() ?? null } : null,
      });
    }

    const traits: PandaTraits = agent.traits || {
      country: user.country || "PT",
      worlds: [],
      vibe: "curious",
      palette: "purple",
    };

    const panda = await generatePanda(traits);
    if (panda.kind !== "ai") {
      // Gemini unavailable right now; scout panda stays, caller may retry later.
      return NextResponse.json({ upgraded: false });
    }

    await client
      .from("agents")
      .update({
        panda_image_url: panda.dataUrl,
        panda_prompt: panda.prompt,
        panda_fallback: false,
        flag_overlay: !!panda.flagMissing,
      })
      .eq("user_id", user.id);

    return NextResponse.json({
      upgraded: true,
      dataUrl: panda.dataUrl,
      flagOverlay: !!panda.flagMissing,
      mint: mintTx ? { tx: mintTx, explorer: explorerTx(mintTx), tokenId: tokenId?.toString() ?? null } : null,
    });
  } catch (e) {
    console.error("[portrait]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "portrait failed" }, { status: 500 });
  }
}

// POST /api/claim: the venue moment. Validate the claim credential (static NFC
// key or rotating QR token), mint the patch edition on-chain via relayer,
// bump gravity, append the growth event to the agent's intelligent data.
import { NextResponse } from "next/server";
import { keccak256, toBytes } from "viem";
import { verifyAuth } from "@/lib/privy";
import { db, addGravity } from "@/lib/db";
import { verifyRotatingToken, verifyStaticKey } from "@/lib/claimToken";
import { AGENT_CONTRACT, PATCHES_CONTRACT, relayerWrite, explorerTx } from "@/lib/chain";
import { agentAbi, patchesAbi } from "@/lib/abi";
import { GRAVITY } from "@/lib/gravity";

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req);
    const { eventId, k, emojiPulse } = await req.json();
    if (!eventId || !k) return NextResponse.json({ error: "eventId and k required" }, { status: 400 });

    const client = db();

    const { data: user } = await client.from("users").select("*").eq("email", auth.email).maybeSingle();
    if (!user) return NextResponse.json({ error: "onboard first", code: "NEEDS_ONBOARD" }, { status: 409 });

    const { data: event } = await client.from("events").select("*").eq("id", eventId).maybeSingle();
    if (!event) return NextResponse.json({ error: "no such event" }, { status: 404 });

    const now = new Date();
    if (now < new Date(event.starts_at) || now > new Date(event.ends_at)) {
      return NextResponse.json({ error: "outside the event window" }, { status: 403 });
    }

    const valid = verifyStaticKey(event.claim_key, k) || verifyRotatingToken(eventId, k);
    if (!valid) return NextResponse.json({ error: "invalid or expired claim credential" }, { status: 403 });

    const { data: prior } = await client
      .from("patches")
      .select("edition")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (prior) {
      return NextResponse.json({ error: "already claimed", edition: prior.edition, code: "ALREADY_CLAIMED" }, { status: 409 });
    }

    // On-chain claim (edition assigned by the contract); DB-only fallback pre-deploy
    let edition: number;
    let txHash: string | null = null;
    if (PATCHES_CONTRACT && event.chain_event_id && user.wallet && process.env.RELAYER_KEYS) {
      const { hash, result } = await relayerWrite({
        address: PATCHES_CONTRACT,
        abi: patchesAbi,
        functionName: "claim",
        args: [user.wallet, BigInt(event.chain_event_id)],
      });
      txHash = hash;
      edition = Number(result);
    } else {
      const { count } = await client
        .from("patches")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);
      edition = (count ?? 0) + 1;
      if (event.cap > 0 && edition > event.cap) {
        return NextResponse.json({ error: "edition cap reached" }, { status: 403 });
      }
    }

    await client.from("patches").insert({
      event_id: eventId,
      user_id: user.id,
      edition,
      tx_hash: txHash,
      emoji_pulse: emojiPulse || null,
    });

    const gained = event.flagship ? GRAVITY.patchClaimFlagship : GRAVITY.patchClaim;
    const { gravity, tier } = await addGravity(user.id, gained);

    // Growth event on the agent (best effort; claim never fails on this)
    const { data: agent } = await client.from("agents").select("token_id").eq("user_id", user.id).maybeSingle();
    if (AGENT_CONTRACT && agent?.token_id !== null && agent?.token_id !== undefined && process.env.RELAYER_KEYS) {
      relayerWrite({
        address: AGENT_CONTRACT,
        abi: agentAbi,
        functionName: "appendIntelligentData",
        args: [
          BigInt(agent.token_id),
          { dataDescription: `patch:${event.chain_event_id ?? eventId}`, dataHash: keccak256(toBytes(`${eventId}:${user.id}:${edition}`)) },
        ],
      }).catch((e) => console.error("[claim] appendIntelligentData failed:", e?.message));
    }

    await client.from("memories").insert({
      user_id: user.id,
      kind: "patch",
      summary: `Zeroed in at ${event.name} (patch #${edition}${event.cap ? ` of ${event.cap}` : ""}).`,
      chain_tx: txHash,
    });

    return NextResponse.json({
      edition,
      cap: event.cap,
      eventName: event.name,
      gravity,
      tier,
      gained,
      tx: txHash ? { hash: txHash, explorer: explorerTx(txHash) } : null,
      agentTokenId: agent?.token_id ?? null,
      hasTelegram: !!(user.socials && user.socials.telegram),
    });
  } catch (e) {
    console.error("[claim]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "claim failed" }, { status: 500 });
  }
}

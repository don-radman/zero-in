// POST /api/onboard: Privy-authed user answers the 4 questions, panda is
// generated (Router image gen or procedural fallback), agent is minted by the
// relayer with profile hashes as IntelligentData. Idempotent per user.
// If contracts are not deployed yet, the row is stored with token_id null and
// the mint is backfilled later (keeps the flow demoable pre-deploy).
import { NextResponse } from "next/server";
import { keccak256, toBytes, parseEventLogs } from "viem";
import { verifyAuth } from "@/lib/privy";
import { db } from "@/lib/db";
import { generatePanda } from "@/lib/panda";
import { AGENT_CONTRACT, PATCHES_CONTRACT, relayerWrite, publicClient, explorerTx } from "@/lib/chain";
import { agentAbi } from "@/lib/abi";

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req);
    const body = await req.json();
    const { country, interest, building, lookingFor, consentScope, socials, vibe, palette } = body;
    if (!country || !building || !lookingFor) {
      return NextResponse.json({ error: "country, building, lookingFor required" }, { status: 400 });
    }

    const client = db();

    // Upsert user
    const { data: user, error: userErr } = await client
      .from("users")
      .upsert(
        {
          email: auth.email,
          privy_id: auth.privyId,
          wallet: auth.wallet,
          country,
          socials: socials || {},
          consent_scope: consentScope || "event",
        },
        { onConflict: "email" }
      )
      .select()
      .single();
    if (userErr) throw userErr;

    // Idempotency: existing agent -> return it
    const { data: existing } = await client.from("agents").select("*").eq("user_id", user.id).maybeSingle();
    if (existing) {
      return NextResponse.json({ user, agent: existing, existed: true });
    }

    // The hatch: generate the panda (never throws; falls back to SVG)
    const traits = {
      country,
      interest: interest || "builder",
      vibe: vibe || "curious",
      palette: palette || "cosmic-purple",
    };
    const panda = await generatePanda(traits);

    // Mint the Agentic ID (profile committed as hashes, never plaintext)
    const profileJson = JSON.stringify({ country, building, lookingFor, socials: socials || {} });
    let tokenId: bigint | null = null;
    let mintTx: string | null = null;

    if (AGENT_CONTRACT && auth.wallet && process.env.RELAYER_KEYS) {
      const datas = [
        { dataDescription: "profile_v1", dataHash: keccak256(toBytes(profileJson)) },
        { dataDescription: "memory_root", dataHash: keccak256(toBytes(`genesis:${user.id}`)) },
      ];
      const { hash } = await relayerWrite({
        address: AGENT_CONTRACT,
        abi: agentAbi,
        functionName: "iMintWithRole",
        args: [auth.wallet, datas, auth.wallet],
      });
      mintTx = hash;
      const receipt = await publicClient.getTransactionReceipt({ hash });
      const transfers = parseEventLogs({ abi: agentAbi, logs: receipt.logs, eventName: "Transfer" });
      tokenId = transfers[0]?.args?.tokenId ?? null;
    }

    const { data: agent, error: agentErr } = await client
      .from("agents")
      .insert({
        user_id: user.id,
        token_id: tokenId !== null ? Number(tokenId) : null,
        panda_image_url: panda.dataUrl,
        panda_prompt: panda.prompt,
        panda_fallback: panda.kind === "svg",
        mint_tx: mintTx,
      })
      .select()
      .single();
    if (agentErr) throw agentErr;

    // Memory mirror ("what my panda knows" reads from here)
    await client.from("memories").insert({
      user_id: user.id,
      kind: "profile",
      summary: `Joined from ${country}. Building: ${building}. Looking for: ${lookingFor}.`,
    });

    return NextResponse.json({
      user,
      agent,
      mint: mintTx ? { tx: mintTx, explorer: explorerTx(mintTx), tokenId: tokenId?.toString() } : null,
    });
  } catch (e) {
    console.error("[onboard]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "onboard failed" }, { status: 500 });
  }
}

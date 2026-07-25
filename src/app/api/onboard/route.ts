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
    const { country, worlds, worldOther, socials, vibe, palette } = body;
    if (!country) {
      return NextResponse.json({ error: "country required" }, { status: 400 });
    }
    const worldList: string[] = Array.isArray(worlds) ? worlds : [];

    const client = db();

    // Upsert user (intro consent is per-event now, captured at claim time)
    const { data: user, error: userErr } = await client
      .from("users")
      .upsert(
        {
          email: auth.email,
          privy_id: auth.privyId,
          wallet: auth.wallet,
          country,
          socials: socials || {},
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

    // The launch: generate the panda (never throws; falls back to SVG)
    const traits = {
      country,
      worlds: worldList,
      worldOther: worldOther || undefined,
      vibe: vibe || "curious",
      palette: palette || "purple",
    };
    const panda = await generatePanda(traits);

    // Mint the Agentic ID (profile committed as hashes, never plaintext)
    const profileJson = JSON.stringify({ country, worlds: worldList, worldOther, socials: socials || {} });
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
    const worldText = [...worldList, worldOther].filter(Boolean).join(", ") || "unspecified";
    await client.from("memories").insert({
      user_id: user.id,
      kind: "profile",
      summary: `Joined from ${country}. World: ${worldText}.`,
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

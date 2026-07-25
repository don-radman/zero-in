// Gasless on-chain consent (the authorizeUsage moment, one tap, explained).
// GET  /api/authorize?tokenId=N -> EIP-712 payload for the member to sign in Privy
// POST /api/authorize { tokenId, signature, deadline, user? } -> relayer submits
import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { AGENT_CONTRACT, publicClient, relayerWrite, zgGalileo, explorerTx } from "@/lib/chain";
import { agentAbi } from "@/lib/abi";

function matcherAddress(): `0x${string}` {
  if (process.env.MATCHER_ADDR) return process.env.MATCHER_ADDR as `0x${string}`;
  const first = (process.env.RELAYER_KEYS || "").split(",")[0]?.trim();
  if (!first) throw new Error("MATCHER_ADDR or RELAYER_KEYS required");
  return privateKeyToAccount(first as `0x${string}`).address;
}

export async function GET(req: Request) {
  try {
    const tokenId = new URL(req.url).searchParams.get("tokenId");
    if (tokenId === null) return NextResponse.json({ error: "tokenId required" }, { status: 400 });
    if (!AGENT_CONTRACT) return NextResponse.json({ error: "contracts not deployed yet" }, { status: 503 });

    const nonce = await publicClient.readContract({
      address: AGENT_CONTRACT,
      abi: agentAbi,
      functionName: "sigNonces",
      args: [BigInt(tokenId)],
    });
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const user = matcherAddress();

    return NextResponse.json({
      typedData: {
        domain: { name: "ZeroInAgent", version: "1", chainId: zgGalileo.id, verifyingContract: AGENT_CONTRACT },
        types: {
          AuthorizeUsage: [
            { name: "tokenId", type: "uint256" },
            { name: "user", type: "address" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "AuthorizeUsage",
        message: { tokenId, user, nonce: nonce.toString(), deadline },
      },
      deadline,
      user,
    });
  } catch (e) {
    console.error("[authorize:GET]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tokenId, signature, deadline, user } = await req.json();
    if (tokenId === undefined || !signature || !deadline) {
      return NextResponse.json({ error: "tokenId, signature, deadline required" }, { status: 400 });
    }
    if (!AGENT_CONTRACT) return NextResponse.json({ error: "contracts not deployed yet" }, { status: 503 });

    const grantee = (user as `0x${string}`) || matcherAddress();
    const { hash } = await relayerWrite({
      address: AGENT_CONTRACT,
      abi: agentAbi,
      functionName: "authorizeUsageWithSig",
      args: [BigInt(tokenId), grantee, BigInt(deadline), signature],
    });
    return NextResponse.json({ tx: hash, explorer: explorerTx(hash), authorized: grantee });
  } catch (e) {
    console.error("[authorize:POST]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

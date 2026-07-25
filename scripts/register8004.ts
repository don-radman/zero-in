// Register agents in the ERC-8004 Identity Registry on Galileo so they appear
// on 8004scan (prize brief requirement). The registry at 0x8004A8...BD9e is not
// source-verified, so this script PROBES known ERC-8004 interface variants via
// free simulation and submits with the first one that works.
//
// Usage: npx tsx scripts/register8004.ts <agentTokenId>
//   Agent card JSON is served at <NEXT_PUBLIC_APP_URL>/api/agent-card/<tokenId>
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { zgGalileo } from "../src/lib/chain";
import { firstRelayerKey, requireEnv } from "./util";

const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;

const CANDIDATES = [
  {
    label: "ERC-8004 v1.0 register(tokenURI, metadata)",
    abi: parseAbi([
      "struct MetadataEntry { string key; bytes value; }",
      "function register(string tokenURI, MetadataEntry[] metadata) returns (uint256)",
    ]),
    args: (cardUrl: string) => [cardUrl, []],
  },
  {
    label: "ERC-8004 v1.0 register(tokenURI)",
    abi: parseAbi(["function register(string tokenURI) returns (uint256)"]),
    args: (cardUrl: string) => [cardUrl],
  },
  {
    label: "ERC-8004 draft newAgent(domain, address)",
    abi: parseAbi(["function newAgent(string agentDomain, address agentAddress) returns (uint256)"]),
    args: (_cardUrl: string, domain?: string, addr?: string) => [domain!, addr!],
  },
] as const;

async function main() {
  const tokenId = process.argv[2];
  if (!tokenId) {
    console.error("Usage: npx tsx scripts/register8004.ts <agentTokenId>");
    process.exit(1);
  }
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL", "deployed app URL (agent card must be publicly reachable)");
  const cardUrl = `${appUrl}/api/agent-card/${tokenId}`;
  const domain = new URL(appUrl).hostname;

  const account = privateKeyToAccount(firstRelayerKey());
  const publicClient = createPublicClient({ chain: zgGalileo, transport: http() });
  const wallet = createWalletClient({ account, chain: zgGalileo, transport: http() });

  for (const candidate of CANDIDATES) {
    try {
      const fn = (candidate.abi as any).find((f: any) => f.type === "function");
      const args = candidate.args(cardUrl, domain, account.address);
      const { request, result } = await publicClient.simulateContract({
        account,
        address: IDENTITY_REGISTRY,
        abi: candidate.abi as any,
        functionName: fn.name,
        args: args as any,
      });
      console.log(`interface matched: ${candidate.label} (agentId would be ${result})`);
      const hash = await wallet.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`status: ${receipt.status}`);
      console.log(`tx: https://chainscan-galileo.0g.ai/tx/${hash}`);
      console.log(`agentId: ${result}`);
      console.log(`check https://www.8004scan.io for the agent card`);
      return;
    } catch (e) {
      console.log(`no match: ${candidate.label} (${e instanceof Error ? e.message.split("\n")[0] : e})`);
    }
  }
  console.error("No known ERC-8004 interface matched. Ask the 0G booth for the registry ABI.");
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });

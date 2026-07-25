// Inspect an Agentic ID's on-chain intelligent data (the sealed envelopes).
// Run: npx tsx scripts/inspect-agent.ts <tokenId>
import "dotenv/config";
import { publicClient, AGENT_CONTRACT } from "../src/lib/chain";
import { agentAbi } from "../src/lib/abi";
import { parseAbi } from "viem";

const abi = parseAbi([
  "struct IntelligentData { string dataDescription; bytes32 dataHash; }",
  "function getIntelligentDatas(uint256 tokenId) view returns (IntelligentData[])",
  "function ownerOf(uint256 tokenId) view returns (address)",
]);

async function main() {
  const tokenId = BigInt(process.argv[2] ?? "0");
  const [owner, datas] = await Promise.all([
    publicClient.readContract({ address: AGENT_CONTRACT, abi, functionName: "ownerOf", args: [tokenId] }),
    publicClient.readContract({ address: AGENT_CONTRACT, abi, functionName: "getIntelligentDatas", args: [tokenId] }),
  ]);
  console.log(`token ${tokenId} owner: ${owner}`);
  console.log(`intelligent data (${datas.length} entries):`);
  for (const d of datas) console.log(`  ${d.dataDescription}: ${d.dataHash}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

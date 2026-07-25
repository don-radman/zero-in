// Print relayer addresses + current gas balances. Use while faucet-funding
// (fund EVERY address at BOTH faucets) and to monitor burn during the event.
// Run: npx tsx scripts/relayers.ts
import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, formatEther } from "viem";
import { zgGalileo } from "../src/lib/chain";

async function main() {
  const keys = (process.env.RELAYER_KEYS || "").split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    console.error("RELAYER_KEYS empty in .env");
    process.exit(1);
  }
  const client = createPublicClient({ chain: zgGalileo, transport: http() });
  for (let i = 0; i < keys.length; i++) {
    const addr = privateKeyToAccount(keys[i] as `0x${string}`).address;
    let balance = "?";
    try {
      balance = formatEther(await client.getBalance({ address: addr }));
    } catch {
      balance = "(rpc unreachable)";
    }
    console.log(`relayer ${i + 1}: ${addr}  ${balance} 0G`);
  }
  console.log("\nFaucets: https://faucet.0g.ai + Google Cloud 0G Galileo faucet (both, per address)");
}

main();

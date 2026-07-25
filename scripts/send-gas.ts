// Send testnet 0G from a relayer to any address (compute deposits, top-ups).
// Run: npx tsx scripts/send-gas.ts <toAddress> <amountOG> [relayerIndex=2]
import "dotenv/config";
import { createWalletClient, http, parseEther, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { zgGalileo, publicClient, waitReceipt } from "../src/lib/chain";
import { requireEnv } from "./util";

async function main() {
  const to = getAddress(process.argv[2] || "");
  const amount = process.argv[3] || "0.1";
  const idx = Number(process.argv[4] ?? 2);
  const keys = requireEnv("RELAYER_KEYS", "funded keys").split(",").map((k) => k.trim());
  const account = privateKeyToAccount(keys[idx] as `0x${string}`);
  const wallet = createWalletClient({ account, chain: zgGalileo, transport: http() });

  console.log(`sending ${amount} 0G from relayer ${idx + 1} (${account.address}) to ${to}`);
  const hash = await wallet.sendTransaction({ to, value: parseEther(amount) });
  await waitReceipt(hash);
  console.log(`done: https://chainscan-galileo.0g.ai/tx/${hash}`);
  const bal = await publicClient.getBalance({ address: to });
  console.log(`recipient balance now: ${Number(bal) / 1e18} 0G`);
}

main().catch((e) => { console.error(e); process.exit(1); });

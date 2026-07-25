// Chain access: viem clients + server-side relayer key pool.
// Users never sign gas transactions; every write goes through a relayer key
// holding MINTER_ROLE / OPERATOR_ROLE. Server-only module (uses private keys).

import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const zgGalileo = defineChain({
  id: 16602,
  name: "0G-Galileo-Testnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "0G Explorer", url: "https://chainscan-galileo.0g.ai" },
  },
});

export const publicClient = createPublicClient({
  chain: zgGalileo,
  transport: http(),
});

function relayerAccounts() {
  const keys = (process.env.RELAYER_KEYS || "").split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error("RELAYER_KEYS not set");
  return keys.map((k) => privateKeyToAccount(k as `0x${string}`));
}

// Round-robin over funded relayer keys to dodge nonce contention and faucet limits.
let cursor = 0;
export function nextRelayer() {
  const accounts = relayerAccounts();
  const account = accounts[cursor % accounts.length];
  cursor += 1;
  return createWalletClient({ account, chain: zgGalileo, transport: http() });
}

export const AGENT_CONTRACT = (process.env.AGENT_CONTRACT || "") as `0x${string}`;
export const PATCHES_CONTRACT = (process.env.PATCHES_CONTRACT || "") as `0x${string}`;

export function explorerTx(hash: string) {
  return `${process.env.NEXT_PUBLIC_EXPLORER || "https://chainscan-galileo.0g.ai"}/tx/${hash}`;
}

export function requireContracts() {
  if (!AGENT_CONTRACT || !PATCHES_CONTRACT) {
    throw new Error("AGENT_CONTRACT / PATCHES_CONTRACT not set (run scripts/deploy.ts first)");
  }
}

/** Simulate-then-write with a relayer key; returns the tx hash after inclusion. */
export async function relayerWrite(params: {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args: readonly unknown[];
}): Promise<{ hash: `0x${string}`; result: unknown }> {
  const wallet = nextRelayer();
  const { request, result } = await publicClient.simulateContract({
    account: wallet.account,
    ...params,
  } as any);
  const hash = await wallet.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return { hash, result };
}

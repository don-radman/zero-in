// Grant MINTER_ROLE + OPERATOR_ROLE on both contracts to every relayer key
// (and MATCHER_ADDR if set). Idempotent: skips grants that already exist.
// Run: npx tsx scripts/grant-roles.ts
import "dotenv/config";
import { getAddress, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { publicClient, zgGalileo, AGENT_CONTRACT, PATCHES_CONTRACT, waitReceipt, requireContracts } from "../src/lib/chain";
import { requireEnv } from "./util";

const abi = parseAbi([
  "function MINTER_ROLE() view returns (bytes32)",
  "function OPERATOR_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account)",
]);

async function main() {
  requireContracts();
  const keys = requireEnv("RELAYER_KEYS", "funded keys").split(",").map((k) => k.trim()).filter(Boolean);
  const admin = privateKeyToAccount(keys[0] as `0x${string}`);
  const wallet = createWalletClient({ account: admin, chain: zgGalileo, transport: http() });

  const grantees = new Set(keys.map((k) => privateKeyToAccount(k as `0x${string}`).address));
  if (process.env.MATCHER_ADDR) grantees.add(getAddress(process.env.MATCHER_ADDR));

  for (const contract of [AGENT_CONTRACT, PATCHES_CONTRACT]) {
    for (const roleName of ["MINTER_ROLE", "OPERATOR_ROLE"] as const) {
      const role = await publicClient.readContract({ address: contract, abi, functionName: roleName });
      for (const grantee of grantees) {
        const has = await publicClient.readContract({
          address: contract, abi, functionName: "hasRole", args: [role, grantee],
        });
        if (has) {
          console.log(`${contract.slice(0, 10)} ${roleName} ${grantee.slice(0, 10)} already granted`);
          continue;
        }
        const { request } = await publicClient.simulateContract({
          account: admin, address: contract, abi, functionName: "grantRole", args: [role, grantee],
        });
        const hash = await wallet.writeContract(request);
        await waitReceipt(hash);
        console.log(`${contract.slice(0, 10)} ${roleName} -> ${grantee} GRANTED`);
      }
    }
  }
  console.log("roles complete");
}

main().catch((e) => { console.error(e); process.exit(1); });

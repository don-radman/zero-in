// Deploy ZeroInAgent + ZeroInPatches to 0G Galileo and grant MINTER_ROLE +
// OPERATOR_ROLE to every relayer key (and MATCHER_ADDR if set).
// Compile first: npx hardhat compile. Then: npx tsx scripts/deploy.ts
import fs from "fs";
import path from "path";
import { createPublicClient, createWalletClient, http, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { zgGalileo } from "../src/lib/chain";
import { requireEnv } from "./util";

function artifact(name: string) {
  const p = path.join(process.cwd(), "artifacts", "contracts", `${name}.sol`, `${name}.json`);
  if (!fs.existsSync(p)) {
    console.error(`Missing artifact ${p}. Run: npx hardhat compile`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function main() {
  const keys = requireEnv("RELAYER_KEYS", "comma-separated funded private keys").split(",").map((k) => k.trim()).filter(Boolean);
  const deployer = privateKeyToAccount(keys[0] as `0x${string}`);
  const publicClient = createPublicClient({ chain: zgGalileo, transport: http() });
  const wallet = createWalletClient({ account: deployer, chain: zgGalileo, transport: http() });

  const balance = await publicClient.getBalance({ address: deployer.address });
  console.log(`deployer ${deployer.address} balance: ${balance} wei`);
  if (balance === 0n) {
    console.error("No gas. Fund at https://faucet.0g.ai");
    process.exit(1);
  }

  const results: Record<string, `0x${string}`> = {};

  for (const [name, args] of [
    ["ZeroInAgent", ["Zero-In Panda", "PANDA", 0n]],
    ["ZeroInPatches", []],
  ] as const) {
    const art = artifact(name);
    console.log(`\ndeploying ${name}...`);
    const hash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode, args: args as any });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress) throw new Error(`${name}: no contract address in receipt`);
    results[name] = getAddress(receipt.contractAddress);
    console.log(`${name} -> ${results[name]}`);
    console.log(`  https://chainscan-galileo.0g.ai/address/${results[name]}`);
  }

  // Grant roles to all relayers + matcher on both contracts
  const grantees = new Set<string>(keys.map((k) => privateKeyToAccount(k as `0x${string}`).address));
  if (process.env.MATCHER_ADDR) grantees.add(getAddress(process.env.MATCHER_ADDR));

  for (const name of ["ZeroInAgent", "ZeroInPatches"] as const) {
    const art = artifact(name);
    for (const roleName of ["MINTER_ROLE", "OPERATOR_ROLE"]) {
      const role = await publicClient.readContract({
        address: results[name], abi: art.abi, functionName: roleName,
      });
      for (const grantee of grantees) {
        if (grantee === deployer.address) continue; // deployer has roles from constructor
        const hash = await wallet.writeContract({
          address: results[name], abi: art.abi, functionName: "grantRole",
          args: [role, grantee],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        console.log(`${name}: ${roleName} -> ${grantee}`);
      }
    }
  }

  console.log("\nPaste into .env:");
  console.log(`AGENT_CONTRACT=${results.ZeroInAgent}`);
  console.log(`PATCHES_CONTRACT=${results.ZeroInPatches}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

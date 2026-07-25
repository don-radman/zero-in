// One-time setup: create .env with 4 fresh relayer keys and random secrets.
// Refuses to overwrite an existing .env. Fill in the remaining blanks
// (Supabase service key, Router key, Privy) by hand.
// Run: npx tsx scripts/gen-env.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  console.error(".env already exists; refusing to overwrite. Delete it first if you mean it.");
  process.exit(1);
}

const keys = Array.from({ length: 4 }, () => generatePrivateKey());

const env = [
  `# Zero-In .env (generated ${new Date().toISOString()}). NEVER commit.`,
  `RELAYER_KEYS=${keys.join(",")}`,
  "OG_RPC_URL=https://evmrpc-testnet.0g.ai",
  "AGENT_CONTRACT=",
  "PATCHES_CONTRACT=",
  "MATCHER_ADDR=",
  "NEXT_PUBLIC_EXPLORER=https://chainscan-galileo.0g.ai",
  "ROUTER_API_KEY=",
  "ROUTER_BASE_URL=https://router-api.0g.ai/v1",
  "STORAGE_INDEXER_URL=https://indexer-storage-testnet-turbo.0g.ai",
  `STORAGE_MASTER_KEY=${crypto.randomBytes(32).toString("hex")}`,
  "NEXT_PUBLIC_PRIVY_APP_ID=",
  "PRIVY_APP_SECRET=",
  "SUPABASE_URL=https://xvwgskevjcldaajcvrzg.supabase.co",
  "SUPABASE_SERVICE_ROLE_KEY=",
  "RESEND_KEY=",
  `CLAIM_HMAC_SECRET=${crypto.randomBytes(32).toString("hex")}`,
  "DEBRIEF_DELAY=120",
  "NEXT_PUBLIC_APP_URL=http://localhost:3000",
  "",
].join("\n");

fs.writeFileSync(envPath, env);
console.log(".env written. Relayer addresses to fund (both faucets each):");
keys.forEach((k, i) => console.log(`  relayer ${i + 1}: ${privateKeyToAccount(k).address}`));

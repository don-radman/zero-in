// Shared helpers for spike + ops scripts (run with: npx tsx scripts/<name>.ts)
import fs from "fs";
import path from "path";
import "dotenv/config";

export function requireEnv(name: string, hint: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`MISSING ENV: ${name}`);
    console.error(`  -> ${hint}`);
    console.error(`  -> copy .env.example to .env and fill it in`);
    process.exit(1);
  }
  return v;
}

const PROOF_PATH = path.join(process.cwd(), "docs", "compute-proof.md");

export function appendComputeReceipt(row: {
  kind: string;
  model: string;
  requestId?: string;
  provider?: string;
  note?: string;
}): void {
  const when = new Date().toISOString();
  const line = `| ${when} | ${row.kind} | ${row.model} | ${row.requestId || "-"} | ${row.provider || "-"} | ${row.note || "-"} |\n`;
  fs.appendFileSync(PROOF_PATH, line);
  console.log(`[receipt] appended to docs/compute-proof.md: ${row.kind} ${row.model}`);
}

export function firstRelayerKey(): `0x${string}` {
  const keys = requireEnv(
    "RELAYER_KEYS",
    "comma-separated private keys funded at https://faucet.0g.ai (plus the Google Cloud 0G faucet)"
  );
  const first = keys.split(",")[0].trim();
  return (first.startsWith("0x") ? first : `0x${first}`) as `0x${string}`;
}

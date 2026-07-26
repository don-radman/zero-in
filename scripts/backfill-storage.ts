// Backfill encrypted memory blobs to 0G Storage for every agent missing a
// memory_root: upload -> save root in DB -> append IntelligentData on-chain.
// Sequential (one storage-fee nonce lane). Safe to re-run any time.
// Run: npx tsx scripts/backfill-storage.ts
import "dotenv/config";
import { db } from "../src/lib/db";
import { uploadMemoryBlob } from "../src/lib/storage";
import { AGENT_CONTRACT, relayerWrite } from "../src/lib/chain";
import { agentAbi } from "../src/lib/abi";

async function main() {
  const client = db();
  const { data: agents } = await client
    .from("agents")
    .select("user_id, token_id, memory_root, users:user_id(country, email)")
    .is("memory_root", null);
  if (!agents?.length) {
    console.log("all agents already have a memory root");
    return;
  }
  console.log(`${agents.length} agents to backfill`);

  let ok = 0;
  for (const a of agents as any[]) {
    try {
      const { data: mems } = await client
        .from("memories")
        .select("kind, summary, created_at")
        .eq("user_id", a.user_id)
        .order("created_at", { ascending: true });
      const root = await uploadMemoryBlob(a.user_id, {
        v: 1,
        country: a.users?.country,
        memories: mems || [],
        exportedAt: new Date().toISOString(),
      });
      await client.from("agents").update({ memory_root: root }).eq("user_id", a.user_id);
      let appended = "";
      if (a.token_id !== null && AGENT_CONTRACT && process.env.RELAYER_KEYS) {
        const { hash } = await relayerWrite({
          address: AGENT_CONTRACT,
          abi: agentAbi,
          functionName: "appendIntelligentData",
          args: [BigInt(a.token_id), { dataDescription: "memory_root", dataHash: root as `0x${string}` }],
        });
        appended = ` + on-chain append ${hash.slice(0, 14)}...`;
      }
      ok++;
      console.log(`${a.users?.email?.slice(0, 3)}***: root ${root.slice(0, 18)}...${appended}`);
    } catch (e) {
      console.error(`${a.users?.email?.slice(0, 3)}*** failed:`, e instanceof Error ? e.message.slice(0, 120) : e);
    }
  }
  console.log(`done: ${ok}/${agents.length} backfilled`);
}

main().catch((e) => { console.error(e); process.exit(1); });

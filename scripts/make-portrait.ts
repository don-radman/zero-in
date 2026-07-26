// Regenerate a member's portrait locally (no serverless time limits) and save
// it to the DB. Targets scout-panda holders by default; --force regenerates a
// photoreal one too (e.g. to refresh a demo account).
// Run: npx tsx scripts/make-portrait.ts <email> [--force]
//      npx tsx scripts/make-portrait.ts --all-fallback
import "dotenv/config";
import { db } from "../src/lib/db";
import { generatePanda, PandaTraits } from "../src/lib/panda";

async function fix(agent: any, user: any) {
  const traits: PandaTraits = agent.traits || {
    country: user.country || "PT",
    worlds: [],
    vibe: "curious",
    palette: "purple",
  };
  process.stdout.write(`${user.email}: generating... `);
  const panda = await generatePanda(traits);
  if (panda.kind !== "ai") {
    console.log("Gemini unavailable, kept as-is");
    return false;
  }
  await db()
    .from("agents")
    .update({
      panda_image_url: panda.dataUrl,
      panda_prompt: panda.prompt,
      panda_fallback: false,
      flag_overlay: false,
    })
    .eq("user_id", user.id);
  console.log("PHOTOREAL saved");
  return true;
}

async function main() {
  const arg = process.argv[2];
  const force = process.argv.includes("--force");
  if (!arg) {
    console.error("Usage: make-portrait.ts <email> [--force] | --all-fallback");
    process.exit(1);
  }
  const client = db();

  if (arg === "--all-fallback") {
    const { data } = await client
      .from("agents")
      .select("*, users:user_id(id, email, country)")
      .eq("panda_fallback", true);
    if (!data?.length) return console.log("nobody is holding a scout panda");
    for (const a of data as any[]) await fix(a, a.users);
    return;
  }

  const { data: user } = await client.from("users").select("*").eq("email", arg).maybeSingle();
  if (!user) return console.error(`no user ${arg}`);
  const { data: agent } = await client.from("agents").select("*").eq("user_id", user.id).maybeSingle();
  if (!agent) return console.error("no agent");
  if (!agent.panda_fallback && !force) return console.log("already photoreal (use --force to regenerate)");
  await fix(agent, user);
}

main().catch((e) => { console.error(e); process.exit(1); });

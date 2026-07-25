// Generate sample panda portraits through the live provider chain and save
// them to docs/samples/ for eyeballing. Use to iterate on the prompt.
// Run: npx tsx scripts/test-panda.ts [count]
import "dotenv/config";
import fs from "fs";
import path from "path";
import { generatePanda, bananaPrompt } from "../src/lib/panda";

const SAMPLES = [
  { country: "PT", worlds: ["founder", "community"], vibe: "curious", palette: "purple" },
  { country: "JP", worlds: ["defi"], vibe: "bold", palette: "teal" },
  { country: "US", worlds: ["marketing"], vibe: "playful", palette: "red" },
];

async function main() {
  const count = Math.min(Number(process.argv[2] || 1), SAMPLES.length);
  const out = path.join(process.cwd(), "docs", "samples");
  fs.mkdirSync(out, { recursive: true });

  for (let i = 0; i < count; i++) {
    const traits = SAMPLES[i] as any;
    console.log(`\n[${i + 1}/${count}] ${traits.country} ${traits.worlds.join("+")} ${traits.palette}`);
    console.log(`prompt: ${bananaPrompt(traits).slice(0, 140)}...`);
    const t0 = Date.now();
    const result = await generatePanda(traits);
    const ms = Date.now() - t0;
    const ext = result.kind === "svg" ? "svg" : "png";
    const file = path.join(out, `panda-${traits.country}-${traits.palette}.${ext}`);
    const data = result.dataUrl.split(",")[1];
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    console.log(`-> ${result.kind.toUpperCase()} in ${(ms / 1000).toFixed(1)}s: ${file}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

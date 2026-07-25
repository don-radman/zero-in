// SPIKE 2: prove 0G Compute Router works for chat AND image generation, and
// start the receipts file (docs/compute-proof.md is a submission requirement).
//
// Run: npx tsx scripts/spike-compute.ts
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { requireEnv, appendComputeReceipt } from "./util";

async function main() {
  const apiKey = requireEnv("ROUTER_API_KEY", "sk- key from https://pc.0g.ai (small deposit; ask 0G booth about hackathon credits)");
  const baseURL = process.env.ROUTER_BASE_URL || "https://router-api.0g.ai/v1";
  const client = new OpenAI({ apiKey, baseURL });

  // 1) Models
  console.log("== GET /v1/models ==");
  const models = await client.models.list();
  const ids = models.data.map((m) => m.id);
  console.log(ids.join("\n"));
  appendComputeReceipt({ kind: "models", model: "-", note: `${ids.length} models: ${ids.slice(0, 6).join(", ")}...` });

  // 2) Chat
  const chatModel = process.env.ROUTER_CHAT_MODEL || ids.find((id) => /glm|llama|qwen|deepseek/i.test(id)) || ids[0];
  console.log(`\n== chat (${chatModel}) ==`);
  const { data: chat, response: chatRes } = await client.chat.completions
    .create({
      model: chatModel,
      messages: [{ role: "user", content: "Reply with exactly: ZERO-IN COMPUTE SPIKE GREEN" }],
      max_tokens: 20,
    })
    .withResponse();
  console.log(chat.choices[0]?.message?.content);
  appendComputeReceipt({
    kind: "chat",
    model: chat.model || chatModel,
    requestId: chat.id || chatRes.headers.get("x-request-id") || undefined,
    provider: chatRes.headers.get("x-provider-address") || undefined,
    note: "spike hello",
  });

  // 3) Image generation (panda pipeline dry run)
  console.log("\n== image generation ==");
  const imageModel = process.env.ROUTER_IMAGE_MODEL || ids.find((id) => /image|flux|sd|dall|diffusion/i.test(id));
  try {
    const { data: img, response: imgRes } = await client.images
      .generate({
        ...(imageModel ? { model: imageModel } : {}),
        prompt:
          "Cute astronaut panda character, flat vector sticker style, centered, facing forward, full body, white background, wearing a space suit with a small backpack",
        response_format: "b64_json",
      })
      .withResponse();
    const b64 = img.data?.[0]?.b64_json;
    if (!b64) throw new Error("no b64_json in response");
    const out = path.join(process.cwd(), "docs", "samples");
    fs.mkdirSync(out, { recursive: true });
    const file = path.join(out, "spike-panda.png");
    fs.writeFileSync(file, Buffer.from(b64, "base64"));
    console.log(`image saved -> ${file}`);
    appendComputeReceipt({
      kind: "image",
      model: imageModel || "(router default)",
      requestId: imgRes.headers.get("x-request-id") || undefined,
      provider: imgRes.headers.get("x-provider-address") || undefined,
      note: "spike panda portrait",
    });
  } catch (e) {
    console.error("Image generation failed (chat spike may still be green). Tripwire Sat 19:00: procedural SVG fallback.");
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 2;
    return;
  }

  console.log("\nSPIKE GREEN (chat + image). Receipts in docs/compute-proof.md");
}

main().catch((e) => { console.error(e); process.exit(1); });

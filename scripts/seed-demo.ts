// Seed a demo cohort so matching, intros, and the dashboard have life before
// (and during) the live demo. Creates one event + 8 plausible hackers with
// procedural pandas, patches, and intents, then runs a match round.
//
// Run: npx tsx scripts/seed-demo.ts   (needs SUPABASE_* in .env)
import "dotenv/config";
import { db } from "../src/lib/db";
import { proceduralPanda } from "../src/lib/panda";
import { runMatch } from "../src/lib/match";
import { GRAVITY, tierFor } from "../src/lib/gravity";
import crypto from "crypto";

const HACKERS = [
  { email: "maria@demo.zero-in.xyz", country: "PT", interest: "builder", building: "agent payment rails on 0G", lookingFor: "design partner for agent payments", fliesOut: "monday", x: "maria_builds" },
  { email: "jonas@demo.zero-in.xyz", country: "DE", interest: "defi", building: "an intent-based DEX aggregator", lookingFor: "someone who gets agent payments", fliesOut: "monday", x: "jonasdefi" },
  { email: "aiko@demo.zero-in.xyz", country: "JP", interest: "researcher", building: "TEE attestation research", lookingFor: "projects that need verifiable compute", fliesOut: "tuesday", x: "aiko_tee" },
  { email: "sam@demo.zero-in.xyz", country: "GB", interest: "builder", building: "verifiable compute marketplace", lookingFor: "a TEE researcher to sanity check the design", fliesOut: "tuesday", x: "samshipping" },
  { email: "lena@demo.zero-in.xyz", country: "UA", interest: "artist", building: "generative art for onchain identity", lookingFor: "a community that wants custom collectible art", fliesOut: "sunday", x: "lenamakes" },
  { email: "diego@demo.zero-in.xyz", country: "AR", interest: "community", building: "a LatAm builder community", lookingFor: "collectible art and identity ideas for members", fliesOut: "sunday", x: "diegocommunity" },
  { email: "priya@demo.zero-in.xyz", country: "IN", interest: "builder", building: "consumer social on embedded wallets", lookingFor: "feedback from wallet infra people", fliesOut: "monday", x: "priyabuilds" },
  { email: "tom@demo.zero-in.xyz", country: "US", interest: "gaming", building: "onchain game economies", lookingFor: "consumer social people to swap notes with", fliesOut: "tuesday", x: "tomplays" },
];

async function main() {
  const client = db();

  const { data: event, error: evErr } = await client
    .from("events")
    .insert({
      name: "ETHGlobal Lisbon: 0G Side Session",
      starts_at: new Date(Date.now() - 3600_000).toISOString(),
      ends_at: new Date(Date.now() + 36 * 3600_000).toISOString(),
      cap: 200,
      claim_key: crypto.randomBytes(12).toString("base64url"),
      ask_the_room: "What should 0G build next for builders like you?",
      flagship: true,
    })
    .select()
    .single();
  if (evErr) throw evErr;
  console.log(`event: ${event.id} (claim key ${event.claim_key})`);

  let edition = 0;
  for (const h of HACKERS) {
    const { data: user, error: uErr } = await client
      .from("users")
      .upsert(
        {
          email: h.email,
          country: h.country,
          socials: { x: h.x },
          consent_scope: "event",
          wallet: `0x${crypto.createHash("sha256").update(h.email).digest("hex").slice(0, 40)}`,
        },
        { onConflict: "email" }
      )
      .select()
      .single();
    if (uErr) throw uErr;

    const palettes = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink"];
    const traits = {
      country: h.country,
      worlds: [h.interest],
      vibe: "curious",
      palette: palettes[edition % palettes.length],
    };
    const svg = proceduralPanda(traits);
    const gravity = GRAVITY.patchClaimFlagship + GRAVITY.intentRegistered;
    await client.from("agents").upsert({
      user_id: user.id,
      panda_image_url: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
      panda_fallback: true,
      gravity,
      tier: tierFor(gravity),
    });

    edition += 1;
    await client.from("patches").upsert({ event_id: event.id, user_id: user.id, edition });
    await client.from("intents").upsert({
      user_id: user.id,
      event_id: event.id,
      looking_for: h.lookingFor,
      logistics: { flies_out: h.fliesOut },
      ask_room_answered: true,
      intros_enabled: true,
    });
    await client.from("memories").insert([
      { user_id: user.id, kind: "profile", summary: `Joined from ${h.country}. World: ${h.building}.` },
      { user_id: user.id, kind: "ask_room", summary: `[demo] Better docs and faster faucets (from ${h.x})` },
    ]);
    console.log(`  seeded ${h.email} (patch #${edition})`);
  }

  const result = await runMatch(event.id);
  console.log(`match round: ${result.created} suggestions across cohort of ${result.cohort}`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  console.log(`\ndashboard: ${appUrl}/host/${event.id}`);
  console.log(`claim URL (NFC): ${appUrl}/z/${event.id}?k=${event.claim_key}`);
  console.log(`rotating QR:     ${appUrl}/host/${event.id}/screen`);
}

main().catch((e) => { console.error(e); process.exit(1); });

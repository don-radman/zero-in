// POST /api/events: 30-second event creation for hosts. Creates the DB row,
// attempts on-chain ZeroInPatches.createEvent (skipped gracefully pre-deploy),
// returns the claim URL to write onto an NFC tag plus the rotating-QR page.
import { NextResponse } from "next/server";
import crypto from "crypto";
import { parseEventLogs } from "viem";
import { db } from "@/lib/db";
import { PATCHES_CONTRACT, relayerWrite, publicClient } from "@/lib/chain";
import { patchesAbi } from "@/lib/abi";

export async function POST(req: Request) {
  try {
    const { name, startsAt, endsAt, cap, askTheRoom, flagship, patchArtUrl } = await req.json();
    if (!name || !startsAt || !endsAt) {
      return NextResponse.json({ error: "name, startsAt, endsAt required" }, { status: 400 });
    }

    const client = db();
    const claimKey = crypto.randomBytes(12).toString("base64url");

    const { data: event, error } = await client
      .from("events")
      .insert({
        name,
        starts_at: startsAt,
        ends_at: endsAt,
        cap: cap ?? 0,
        claim_key: claimKey,
        ask_the_room: askTheRoom || null,
        patch_art_url: patchArtUrl || null,
        flagship: !!flagship,
      })
      .select()
      .single();
    if (error) throw error;

    // On-chain event (best effort pre-deploy)
    let chainEventId: string | null = null;
    if (PATCHES_CONTRACT && process.env.RELAYER_KEYS) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const { hash, result } = await relayerWrite({
        address: PATCHES_CONTRACT,
        abi: patchesAbi,
        functionName: "createEvent",
        args: [
          name,
          BigInt(Math.floor(new Date(startsAt).getTime() / 1000)),
          BigInt(Math.floor(new Date(endsAt).getTime() / 1000)),
          cap ?? 0,
          "venue",
          `${appUrl}/api/tokenuri/patch/${event.id}`,
        ],
      });
      chainEventId = String(result);
      await client.from("events").update({ chain_event_id: Number(result) }).eq("id", event.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.json({
      event: { ...event, chain_event_id: chainEventId },
      claimUrl: `${appUrl}/z/${event.id}?k=${claimKey}`, // write this onto the NFC tag
      screenUrl: `${appUrl}/host/${event.id}/screen`, // rotating QR fallback
      dashboardUrl: `${appUrl}/host/${event.id}`,
    });
  } catch (e) {
    console.error("[events]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "event creation failed" }, { status: 500 });
  }
}

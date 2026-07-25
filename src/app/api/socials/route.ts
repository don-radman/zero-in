// POST /api/socials: update the member's handles from the Panda Dash.
// Private by default; only ever shared one-to-one after a mutual intro yes.
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/privy";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req);
    const body = await req.json();
    const client = db();
    const { data: user } = await client.from("users").select("id, socials").eq("email", auth.email).maybeSingle();
    if (!user) return NextResponse.json({ error: "onboard first" }, { status: 404 });

    const merged: Record<string, string> = { ...(user.socials || {}) };
    for (const key of ["x", "github", "telegram", "linkedin", "farcaster"]) {
      if (typeof body[key] === "string") {
        const v = body[key].trim().replace(/^@/, "");
        if (v) merged[key] = v;
        else delete merged[key];
      }
    }
    const { error } = await client.from("users").update({ socials: merged }).eq("id", user.id);
    if (error) throw error;
    return NextResponse.json({ socials: merged });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

// DELETE /api/memories/[id]: the member's right to make their panda forget.
// Cheap to build, disproportionate trust payoff (PRD 6.7).
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/privy";
import { db } from "@/lib/db";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(req);
    const { id } = await params;
    const client = db();

    const { data: user } = await client.from("users").select("id").eq("email", auth.email).maybeSingle();
    if (!user) return NextResponse.json({ error: "unknown user" }, { status: 404 });

    const { error } = await client.from("memories").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ forgotten: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

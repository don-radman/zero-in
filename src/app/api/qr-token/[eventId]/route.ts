// GET /api/qr-token/[eventId]: current rotating claim token for the host
// screen. Polled by the screen page; token flips every 45s, TTL 90s.
import { NextResponse } from "next/server";
import { rotatingToken } from "@/lib/claimToken";

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { token, msLeft } = rotatingToken(eventId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.json({
    token,
    msLeft,
    claimUrl: `${appUrl}/z/${eventId}?k=${token}`,
  });
}

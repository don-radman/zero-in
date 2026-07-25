// Claim credentials, two tiers (see docs/trust-model.md):
// 1. Static claim key: baked into the NFC tag URL ("venue-attested-lite").
// 2. Rotating QR token: HMAC(CLAIM_HMAC_SECRET, eventId|timeslice) where the
//    timeslice advances every 45s. We accept the current and previous slice,
//    giving an effective TTL of up to 90s.
import crypto from "crypto";

const SLICE_MS = 45_000;
const ACCEPT_SLICES = 2; // current + previous = 90s TTL

function hmacSecret(): Buffer {
  const s = process.env.CLAIM_HMAC_SECRET;
  if (!s) throw new Error("CLAIM_HMAC_SECRET not set");
  return Buffer.from(s, "hex");
}

function tokenForSlice(eventId: string, slice: number): string {
  return crypto
    .createHmac("sha256", hmacSecret())
    .update(`${eventId}|${slice}`)
    .digest("base64url")
    .slice(0, 16);
}

/** Current rotating token for an event (rendered as QR on the host screen). */
export function rotatingToken(eventId: string, now = Date.now()): { token: string; msLeft: number } {
  const slice = Math.floor(now / SLICE_MS);
  return {
    token: tokenForSlice(eventId, slice),
    msLeft: SLICE_MS - (now % SLICE_MS),
  };
}

/** Verify a rotating token within the TTL window. */
export function verifyRotatingToken(eventId: string, token: string, now = Date.now()): boolean {
  const slice = Math.floor(now / SLICE_MS);
  for (let i = 0; i < ACCEPT_SLICES; i++) {
    const candidate = tokenForSlice(eventId, slice - i);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(token.padEnd(candidate.length).slice(0, candidate.length)))) {
      return true;
    }
  }
  return false;
}

/** Static claim key comparison, constant time. */
export function verifyStaticKey(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided.padEnd(expected.length).slice(0, expected.length));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

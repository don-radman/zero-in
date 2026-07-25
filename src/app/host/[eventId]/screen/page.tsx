// Rotating QR fallback screen for venues without NFC.
// QR encodes /z/<eventId>?k=HMAC(CLAIM_HMAC_SECRET + eventId, 45s timeslice); token TTL 90s.
export default async function ScreenPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Scan to zero in</h1>
      <p className="text-sm opacity-70">Event {eventId}</p>
      <p>TODO(P0): rotating QR component</p>
    </main>
  );
}

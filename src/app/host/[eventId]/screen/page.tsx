// Rotating QR fallback screen for venues without NFC. Shown on a laptop or TV
// at the door; the QR flips every 45 seconds (token TTL 90s server-side).
import ScreenQR from "@/components/ScreenQR";

export default async function ScreenPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-black">Scan to zero in</h1>
      <ScreenQR eventId={eventId} />
      <p className="text-sm opacity-40">Fresh code every 45 seconds. Screenshots will not work.</p>
    </main>
  );
}

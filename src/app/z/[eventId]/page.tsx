// Claim flow entry: NFC tags and rotating QR land here with ?k=<claimKey or rotating token>.
// P0: validate token server-side, then onboard-if-new -> claim patch -> gravity -> confirmation.
export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { eventId } = await params;
  const { k } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Zero in</h1>
      <p className="text-sm opacity-70">
        Event {eventId} {k ? "(claim key received)" : "(no claim key)"}
      </p>
      <p>TODO(P0): claim flow</p>
    </main>
  );
}

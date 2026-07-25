// Issuer dashboard: event setup output (claim URL for NFC/QR) + aggregates only
// (attendance, first-timers, intros, Ask the Room synthesis; minimum cohort 5).
export default async function HostPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Mission control: {eventId}</h1>
      <p>TODO(P2): aggregates dashboard</p>
    </main>
  );
}

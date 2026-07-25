// Issuer dashboard: aggregates only (min cohort 5 for Ask-the-Room).
import HostDashboard from "@/components/HostDashboard";

export default async function HostPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <main className="flex-1 px-6">
      <HostDashboard eventId={eventId} />
    </main>
  );
}

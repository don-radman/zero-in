// Claim flow entry: NFC tags and rotating QR land here with ?k=<key or token>.
import ClaimFlow from "@/components/ClaimFlow";

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
    <main className="mx-auto w-full max-w-xl flex-1 px-6">
      <ClaimFlow eventId={eventId} k={k} />
    </main>
  );
}

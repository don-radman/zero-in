"use client";
// The venue moment: land from NFC/QR, claim the patch, watch gravity move.
// Target: under 10 seconds end to end for a returning member.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { authedFetch, devMode, getDevEmail } from "@/lib/clientAuth";

const EMOJI = ["🔥", "🤝", "🧠", "😴", "🚀"];

type Phase = "loading" | "ready" | "claiming" | "done" | "error";

function useAccessToken(): { ready: boolean; get: () => Promise<string | null>; authed: boolean } {
  // In dev mode there is no Privy context; keep the hook order stable.
  if (devMode()) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return { ready: true, get: async () => null, authed: !!getDevEmail() };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { ready, authenticated, getAccessToken } = usePrivy();
  return { ready, get: getAccessToken, authed: authenticated };
}

export default function ClaimFlow({ eventId, k }: { eventId: string; k?: string }) {
  const router = useRouter();
  const token = useAccessToken();
  const [phase, setPhase] = useState<Phase>("loading");
  const [event, setEvent] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setEvent(d);
        setPhase("ready");
      })
      .catch((e) => {
        setError(e.message);
        setPhase("error");
      });
  }, [eventId]);

  async function claim() {
    if (!k) {
      setError("This link is missing its claim key. Tap the tag again or scan the screen QR.");
      setPhase("error");
      return;
    }
    if (!token.authed) {
      router.push(`/onboard?next=${encodeURIComponent(`/z/${eventId}?k=${k}`)}`);
      return;
    }
    setPhase("claiming");
    try {
      const t = await token.get();
      const res = await authedFetch(
        "/api/claim",
        { method: "POST", body: JSON.stringify({ eventId, k, emojiPulse: emoji }) },
        t
      );
      const data = await res.json();
      if (res.status === 409 && data.code === "NEEDS_ONBOARD") {
        router.push(`/onboard?next=${encodeURIComponent(`/z/${eventId}?k=${k}`)}`);
        return;
      }
      if (!res.ok) throw new Error(data.error || "claim failed");
      setResult(data);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "claim failed");
      setPhase("error");
    }
  }

  if (phase === "loading") return <p className="py-24 text-center opacity-60">Finding the event...</p>;

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-red-400">{error}</p>
        <button onClick={() => router.refresh()} className="text-sm underline opacity-70">
          try again
        </button>
      </div>
    );
  }

  if (phase === "done" && result) {
    return (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <p className="text-sm uppercase tracking-widest text-[#18B8A6]">Patch secured</p>
        <h1 className="text-3xl font-bold">{result.eventName}</h1>
        <div className="rounded-3xl border border-[#18B8A6]/40 bg-[#18B8A6]/10 px-10 py-8">
          <p className="text-5xl font-black">#{result.edition}</p>
          {result.cap > 0 && <p className="mt-1 text-sm opacity-60">of {result.cap}</p>}
        </div>
        <p className="text-lg">
          +{result.gained} gravity <span className="opacity-60">(total {result.gravity}, {result.tier})</span>
        </p>
        {result.tx && (
          <a href={result.tx.explorer} target="_blank" className="text-xs text-[#18B8A6] underline">
            sewn on-chain (view transaction)
          </a>
        )}
        <button
          onClick={() => router.push("/me")}
          className="mt-2 rounded-full bg-[#7C5CFF] px-8 py-3 font-semibold hover:opacity-90"
        >
          See your suit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <p className="text-sm uppercase tracking-widest text-[#7C5CFF]">Zero in</p>
      <h1 className="text-3xl font-bold">{event?.event?.name}</h1>
      <p className="opacity-60">
        {event?.claimed} {event?.claimed === 1 ? "person has" : "people have"} zeroed in
        {event?.event?.cap ? ` (cap ${event.event.cap})` : ""}
      </p>
      <div className="flex gap-2">
        {EMOJI.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(emoji === e ? null : e)}
            className={`rounded-full border p-2 text-xl ${emoji === e ? "border-[#7C5CFF] bg-[#7C5CFF]/20" : "border-white/10"}`}
          >
            {e}
          </button>
        ))}
      </div>
      <p className="text-xs opacity-40">optional: how is it so far?</p>
      <button
        onClick={claim}
        disabled={phase === "claiming" || !token.ready}
        className="rounded-full bg-[#7C5CFF] px-10 py-4 text-lg font-semibold hover:opacity-90 disabled:opacity-40"
      >
        {phase === "claiming" ? "Sewing your patch..." : "Claim your patch"}
      </button>
    </div>
  );
}

"use client";
// The venue moment: land from NFC/QR, claim the patch, watch gravity move.
// After the patch is secured, the intent card captures "what are you looking
// for HERE", logistics, the issuer's Ask-the-Room question, and the per-event
// intros opt-in. Target: claim itself stays under 10 seconds.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { authedFetch, devMode, getDevEmail } from "@/lib/clientAuth";
import ConsentTap from "@/components/ConsentTap";

const HEADS_OUT = [
  ["", "Not sure yet"],
  ["saturday", "Tonight"],
  ["sunday", "Sunday"],
  ["monday", "Monday"],
  ["later", "Sticking around"],
] as const;

type Phase = "loading" | "ready" | "claiming" | "stars" | "done" | "error";

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

  // Intent card state (post-claim)
  const [lookingFor, setLookingFor] = useState("");
  const [headsOut, setHeadsOut] = useState("");
  const [askRoomAnswer, setAskRoomAnswer] = useState("");
  const [introsEnabled, setIntrosEnabled] = useState(true);
  const [telegram, setTelegram] = useState("");
  const [intentError, setIntentError] = useState<string | null>(null);
  const [intentState, setIntentState] = useState<"open" | "saving" | "saved" | "skipped">("open");

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
        { method: "POST", body: JSON.stringify({ eventId, k }) },
        t
      );
      const data = await res.json();
      if (res.status === 409 && data.code === "NEEDS_ONBOARD") {
        router.push(`/onboard?next=${encodeURIComponent(`/z/${eventId}?k=${k}`)}`);
        return;
      }
      if (!res.ok) throw new Error(data.error || "claim failed");
      setResult(data);
      setPhase("stars");
      setTimeout(() => setPhase("done"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "claim failed");
      setPhase("error");
    }
  }

  async function saveIntent() {
    setIntentError(null);
    if (introsEnabled && !result?.hasTelegram && !telegram.trim()) {
      setIntentError("Intros need a Telegram handle so your intro can reach you.");
      return;
    }
    setIntentState("saving");
    try {
      const t = await token.get();
      await authedFetch(
        "/api/intent",
        {
          method: "POST",
          body: JSON.stringify({
            eventId,
            lookingFor: lookingFor.trim() || undefined,
            logistics: headsOut ? { flies_out: headsOut } : {},
            askRoomAnswer: askRoomAnswer.trim() || undefined,
            introsEnabled,
            telegram: telegram.trim() || undefined,
          }),
        },
        t
      );
      setIntentState("saved");
    } catch {
      setIntentState("open");
    }
  }

  if (phase === "loading") return <p className="py-24 text-center opacity-60">Finding the event...</p>;

  if (phase === "stars") {
    return (
      <div className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden text-center">
        {Array.from({ length: 18 }, (_, i) => (
          <span
            key={i}
            className="shooting-star"
            style={{
              left: `${(i * 11.7) % 100}%`,
              top: `${(i * 17.3) % 80}%`,
              animationDelay: `${(i * 0.08).toFixed(2)}s`,
            }}
          />
        ))}
        <p className="text-2xl font-black tracking-wide">Patch secured</p>
      </div>
    );
  }

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
      <div className="flex flex-col items-center gap-5 py-12 text-center">
        <p className="text-sm uppercase tracking-widest text-[#18B8A6]">Patch secured</p>
        <h1 className="text-3xl font-bold">{result.eventName}</h1>
        {event?.event?.patch_art_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.event.patch_art_url}
            alt="Your patch"
            className="w-48 rounded-xl border border-[#18B8A6]/40"
          />
        )}
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

        {intentState === "saved" || intentState === "skipped" ? (
          <>
            {intentState === "saved" && introsEnabled ? (
              <>
                {result.agentTokenId !== null && result.agentTokenId !== undefined && !devMode() && (
                  <div className="w-full max-w-md">
                    <ConsentTap tokenId={result.agentTokenId} getToken={token.get} />
                  </div>
                )}
                <button
                  onClick={() => router.push("/me")}
                  className="mt-3 w-full max-w-md rounded-full border-2 border-[#18B8A6] px-8 py-3 font-semibold text-[#5EEAD4] hover:bg-[#18B8A6]/10"
                >
                  Open your Panda Dash: your +10 pulse is waiting
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push("/me")}
                className="mt-2 rounded-full bg-[#7C5CFF] px-8 py-3 font-semibold hover:opacity-90"
              >
                Open your Panda Dash: your +10 pulse is waiting
              </button>
            )}
          </>
        ) : (
          <div className="mt-2 w-full max-w-md rounded-2xl border border-[#7C5CFF]/40 bg-[#7C5CFF]/5 p-5 text-left">
            <p className="font-semibold">While your patch is sewn on...</p>

            <label className="mt-4 block">
              <span className="text-sm">What are you looking for here?</span>
              <input
                value={lookingFor}
                onChange={(e) => setLookingFor(e.target.value)}
                placeholder="Cofounder, first users, good conversations..."
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 p-3 text-sm"
              />
              <span className="text-xs opacity-45">Helps your panda find your people.</span>
            </label>

            <label className="mt-3 block">
              <span className="text-sm">When do you head out?</span>
              <select
                value={headsOut}
                onChange={(e) => setHeadsOut(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 p-3 text-sm"
              >
                {HEADS_OUT.map(([v, label]) => (
                  <option key={v} value={v} className="bg-[#0a0a14]">
                    {label}
                  </option>
                ))}
              </select>
              <span className="text-xs opacity-45">Shared windows make better intros.</span>
            </label>

            {event?.event?.ask_the_room && (
              <label className="mt-3 block">
                <span className="text-sm">{event.event.ask_the_room}</span>
                <textarea
                  value={askRoomAnswer}
                  onChange={(e) => setAskRoomAnswer(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 p-3 text-sm"
                />
                <span className="text-xs opacity-45">Shared with the host anonymously, never with your name attached.</span>
              </label>
            )}

            <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border border-white/10 p-3">
              <span className="text-sm">Let my panda introduce me to people at this event</span>
              <input
                type="checkbox"
                checked={introsEnabled}
                onChange={(e) => setIntrosEnabled(e.target.checked)}
                className="h-5 w-5 accent-[#7C5CFF]"
              />
            </label>

            {introsEnabled && !result.hasTelegram && (
              <label className="mt-3 block">
                <span className="text-sm">Telegram handle</span>
                <input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@yourhandle"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 p-3 text-sm"
                />
                <span className="text-xs opacity-45">
                  So your intro can actually reach you. Private by default, only
                  shared after you both say yes.
                </span>
              </label>
            )}

            {intentError && <p className="mt-2 text-sm text-red-400">{intentError}</p>}

            <div className="mt-4 flex gap-3">
              <button
                onClick={saveIntent}
                disabled={intentState === "saving"}
                className="rounded-full bg-[#7C5CFF] px-6 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-40"
              >
                {intentState === "saving" ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setIntentState("skipped")}
                className="rounded-full border border-white/15 px-6 py-2 text-sm opacity-60 hover:opacity-100"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <p className="text-sm uppercase tracking-widest text-[#7C5CFF]">Zero-In</p>
      <h1 className="text-3xl font-bold">{event?.event?.name}</h1>
      {event?.event?.patch_art_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.event.patch_art_url}
          alt={`${event.event.name} patch`}
          className="w-64 rounded-2xl border border-white/15 shadow-[0_0_30px_rgba(124,92,255,0.25)]"
        />
      )}
      <p className="opacity-60">
        {event?.claimed} {event?.claimed === 1 ? "person has" : "people have"} zeroed in
        {event?.event?.cap ? ` (cap ${event.event.cap})` : ""}
      </p>
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

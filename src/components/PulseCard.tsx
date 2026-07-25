"use client";
// The optional one-time event pulse (+10 gravity): vibes, connections, one
// suggestion. Submitting fires shooting stars and counts the gravity in.
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/clientAuth";

const VIBES = ["Optimistic", "Hopeful", "Energizing", "Amazing", "Epic", "Fun", "Bearish"] as const;

export default function PulseCard({
  eventId,
  eventName,
  startGravity,
  getToken,
  onDone,
}: {
  eventId: string;
  eventName: string;
  startGravity: number;
  getToken: () => Promise<string | null>;
  onDone: () => void;
}) {
  const [vibes, setVibes] = useState<string[]>([]);
  const [otherOn, setOtherOn] = useState(false);
  const [vibeOther, setVibeOther] = useState("");
  const [madeConnections, setMadeConnections] = useState<boolean | null>(null);
  const [improvement, setImprovement] = useState("");
  const [state, setState] = useState<"open" | "saving" | "done">("open");
  const [displayGravity, setDisplayGravity] = useState(startGravity);
  const [finalGravity, setFinalGravity] = useState<number | null>(null);

  function toggleVibe(v: string) {
    setVibes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  async function submit() {
    setState("saving");
    try {
      const t = await getToken();
      const res = await authedFetch(
        "/api/pulse",
        {
          method: "POST",
          body: JSON.stringify({
            eventId,
            vibes,
            vibeOther: otherOn && vibeOther.trim() ? vibeOther.trim() : undefined,
            madeConnections: madeConnections === true,
            improvement: improvement.trim() || undefined,
          }),
        },
        t
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setFinalGravity(d.gravity);
      setState("done");
    } catch {
      setState("open");
    }
  }

  // Gravity count-up once the stars fly
  useEffect(() => {
    if (state !== "done" || finalGravity === null) return;
    const steps = finalGravity - startGravity;
    if (steps <= 0) return;
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setDisplayGravity(startGravity + i);
      if (i >= steps) {
        clearInterval(t);
        setTimeout(onDone, 1600);
      }
    }, 90);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, finalGravity]);

  if (state === "done") {
    return (
      <section className="relative mt-10 overflow-hidden rounded-2xl border border-[#18B8A6]/40 bg-[#18B8A6]/10 p-6 text-center">
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="shooting-star"
            style={{
              left: `${(i * 7.3) % 100}%`,
              top: `${(i * 13.7) % 60}%`,
              animationDelay: `${(i * 0.13).toFixed(2)}s`,
            }}
          />
        ))}
        <p className="text-sm uppercase tracking-widest text-[#18B8A6]">Pulse shared</p>
        <p className="mt-2 text-4xl font-black">
          {displayGravity} <span className="text-base font-medium opacity-50">gravity</span>
        </p>
        <p className="mt-1 text-sm opacity-70">+10 for telling the room how it feels.</p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border border-[#18B8A6]/40 bg-[#18B8A6]/10 p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold">Quick pulse: {eventName}</p>
        <span className="rounded-full bg-[#18B8A6]/20 px-3 py-1 text-xs font-semibold text-[#5EEAD4]">+10 gravity</span>
      </div>
      <p className="mt-1 text-xs opacity-50">Optional, once per patch. The host only ever sees the room combined.</p>

      <p className="mt-4 text-sm font-medium">How do you feel about the vibes here?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {VIBES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggleVibe(v)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              vibes.includes(v) ? "border-[#18B8A6] bg-[#18B8A6]/20" : "border-white/15 hover:border-white/30"
            }`}
          >
            {v}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOtherOn(!otherOn)}
          className={`rounded-full border px-3 py-1.5 text-sm ${otherOn ? "border-[#18B8A6] bg-[#18B8A6]/20" : "border-white/15 hover:border-white/30"}`}
        >
          Other
        </button>
      </div>
      {otherOn && (
        <input
          value={vibeOther}
          onChange={(e) => setVibeOther(e.target.value)}
          placeholder="One word for it..."
          className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 p-2 text-sm"
        />
      )}

      <p className="mt-4 text-sm font-medium">Did you make any great new connections yet?</p>
      <div className="mt-2 flex gap-2">
        {[
          [true, "Yes"],
          [false, "Not yet"],
        ].map(([val, label]) => (
          <button
            key={String(val)}
            type="button"
            onClick={() => setMadeConnections(val as boolean)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              madeConnections === val ? "border-[#18B8A6] bg-[#18B8A6]/20" : "border-white/15 hover:border-white/30"
            }`}
          >
            {label as string}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm font-medium">One thing that would make this event better?</p>
      <input
        value={improvement}
        onChange={(e) => setImprovement(e.target.value)}
        placeholder="Short and honest..."
        className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 p-2 text-sm"
      />

      <button
        onClick={submit}
        disabled={state === "saving"}
        className="mt-4 rounded-full bg-[#18B8A6] px-6 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-40"
      >
        {state === "saving" ? "Sending..." : "Share pulse (+10)"}
      </button>
    </section>
  );
}

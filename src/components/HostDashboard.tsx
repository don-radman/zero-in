"use client";
// Host mission control: the live pulse of the room. Aggregates only.
import { useEffect, useState } from "react";

export default function HostDashboard({ eventId }: { eventId: string }) {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);

  async function load() {
    const res = await fetch(`/api/host/${eventId}/stats`);
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);
    setStats(d);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    const t = setInterval(() => load().catch(() => {}), 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function runMatch() {
    setMatching(true);
    await fetch("/api/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId }) });
    setMatching(false);
    load().catch(() => {});
  }

  if (error) return <p className="py-20 text-center text-red-400">{error}</p>;
  if (!stats) return <p className="py-20 text-center opacity-60">Reading the room...</p>;

  const tiles = [
    ["Zeroed in", stats.claims],
    ["First-timers", stats.firstTimers],
    ["Hunting (opted in)", stats.optedIn ?? 0],
    ["Intros suggested", stats.intros.created],
    ["Connections made", stats.intros.matched],
    ["Debriefs done", stats.debriefsDone],
  ] as const;

  return (
    <div className="mx-auto w-full max-w-2xl py-10">
      <p className="text-sm uppercase tracking-widest text-[#7C5CFF]">Mission control</p>
      <h1 className="text-3xl font-bold">{stats.event.name}</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-3xl font-black">{value}</p>
            <p className="text-xs uppercase tracking-wider opacity-50">{label}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-2xl">{Object.entries(stats.emojis).map(([e, n]) => `${e}${n}`).join(" ") || "-"}</p>
          <p className="text-xs uppercase tracking-wider opacity-50">Room pulse</p>
        </div>
      </div>

      {stats.pulse?.shared > 0 && (
        <section className="mt-8 rounded-2xl border border-white/10 p-4">
          <h2 className="font-bold">Event pulse</h2>
          <p className="mt-1 text-xs opacity-50">{stats.pulse.shared} shared · {stats.pulse.connectionsYes} already made new connections</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(stats.pulse.vibes)
              .sort((a: any, b: any) => b[1] - a[1])
              .map(([v, n]: any) => (
                <span key={v} className="rounded-full bg-[#18B8A6]/15 px-3 py-1 text-sm">
                  {v} <span className="opacity-50">x{n}</span>
                </span>
              ))}
          </div>
          {stats.pulse.improvements.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-sm opacity-80">
              {stats.pulse.improvements.slice(0, 8).map((s: string, i: number) => (
                <li key={i}>- {s}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-white/10 p-4">
        <h2 className="font-bold">Ask the Room</h2>
        {stats.askTheRoom.question ? (
          <>
            <p className="mt-1 text-sm opacity-70">&quot;{stats.askTheRoom.question}&quot;</p>
            {stats.askTheRoom.summary && (
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm">{stats.askTheRoom.summary}</pre>
            )}
            {stats.askTheRoom.answersList?.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1 text-sm opacity-80">
                {stats.askTheRoom.answersList.map((a: string, i: number) => (
                  <li key={i}>- {a}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm opacity-50">No answers yet.</p>
            )}
            <p className="mt-2 text-[10px] uppercase tracking-wider opacity-40">
              Anonymous, no names attached. Synthesis on 0G Compute at {stats.minCohort}+ answers.
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm opacity-50">No question set for this event.</p>
        )}
      </section>

      <button
        onClick={runMatch}
        disabled={matching}
        className="mt-6 rounded-full bg-[#7C5CFF] px-6 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-40"
      >
        {matching ? "Panda is hunting..." : "Run a match round"}
      </button>
    </div>
  );
}

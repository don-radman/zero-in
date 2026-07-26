"use client";
// Suggestion cards: person, reason, shared window. Both tap yes -> the intro
// message lands. Pass = silent expiry ("your panda keeps looking").
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/clientAuth";
import { flagUrl } from "@/lib/countries";

export default function SuggestionCards({ getToken }: { getToken: () => Promise<string | null> }) {
  const [cards, setCards] = useState<any[] | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  async function load() {
    const t = await getToken();
    const res = await authedFetch("/api/suggestions", {}, t);
    const d = await res.json();
    if (res.ok) setCards(d.suggestions);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function respond(id: string, accept: boolean) {
    if (respondingId) return; // no double-taps
    setRespondingId(id);
    try {
      const t = await getToken();
      await authedFetch(`/api/suggestions/${id}/respond`, { method: "POST", body: JSON.stringify({ accept }) }, t);
      await load();
    } finally {
      setRespondingId(null);
    }
  }

  if (!cards) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-lg font-bold">Panda Connections</h2>
      <p className="mb-3 text-xs opacity-50">
        When two pandas find a match, both humans get asked. A double yes makes
        it a Connection: the intro lands with the reason and a time.
      </p>
      {cards.length === 0 && <p className="text-sm opacity-50">Your panda keeps looking...</p>}
      <div className="flex flex-col gap-3">
        {cards.map((c) => (
          <div key={c.id} className={`rounded-2xl border p-4 ${c.status === "matched" ? "border-[#18B8A6]/50 bg-[#18B8A6]/10" : "border-[#7C5CFF]/40 bg-[#7C5CFF]/5"}`}>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{c.other.name}</p>
              {c.other.country && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={flagUrl(c.other.country)} alt={c.other.country} className="h-4 rounded-sm" />
              )}
              <span className="ml-auto text-[10px] uppercase tracking-wider opacity-40">{c.event}</span>
            </div>
            {c.other.profile && <p className="mt-1 text-xs opacity-60">{c.other.profile}</p>}
            <p className="mt-2 text-sm">{c.reason}</p>
            {c.status === "matched" ? (
              <div className="mt-3 rounded-xl bg-black/30 p-3">
                <p className="text-sm">{c.introMessage}</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {c.other.contact?.type === "telegram" && (
                    <a href={`https://t.me/${c.other.contact.value}`} target="_blank" className="text-xs font-semibold text-[#18B8A6] underline">
                      Message @{c.other.contact.value} on Telegram
                    </a>
                  )}
                  {c.other.contact?.type === "email" && c.other.contact.value && (
                    <a href={`mailto:${c.other.contact.value}`} className="text-xs font-semibold text-[#18B8A6] underline">
                      Email {c.other.contact.value}
                    </a>
                  )}
                  {c.other.socials?.x && (
                    <a href={`https://x.com/${c.other.socials.x.replace(/^@/, "")}`} target="_blank" className="text-xs text-[#18B8A6] underline opacity-70">
                      @{c.other.socials.x.replace(/^@/, "")} on X
                    </a>
                  )}
                </div>
              </div>
            ) : c.iAccepted ? (
              <p className="mt-3 text-xs opacity-60">You said yes. Waiting for {c.other.name}...</p>
            ) : (
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => respond(c.id, true)}
                  disabled={respondingId !== null}
                  className="flex items-center gap-2 rounded-full bg-[#7C5CFF] px-6 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {respondingId === c.id && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  {respondingId === c.id ? "Sending your yes..." : "Yes, intro us"}
                </button>
                <button
                  onClick={() => respond(c.id, false)}
                  disabled={respondingId !== null}
                  className="rounded-full border border-white/15 px-6 py-2 text-sm opacity-60 hover:opacity-100 disabled:opacity-30"
                >
                  Pass
                </button>
              </div>
            )}
            {c.window && c.status !== "matched" && <p className="mt-2 text-xs opacity-40">{c.window}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

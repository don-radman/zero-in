"use client";
// "Teach your panda": short chat where the agent learns about you.
// Everything you share appears in "what my panda knows" and is deletable.
import { useState } from "react";
import { authedFetch } from "@/lib/clientAuth";

type Turn = { role: "user" | "assistant"; content: string };

export default function TeachPanda({ getToken, onTaught }: { getToken: () => Promise<string | null>; onTaught: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([
    { role: "assistant", content: "Tell me about you. What should I know?" },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setBusy(true);
    const history = turns;
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    try {
      const t = await getToken();
      const res = await authedFetch("/api/teach", { method: "POST", body: JSON.stringify({ message, history }) }, t);
      const d = await res.json();
      if (res.ok) {
        setTurns((prev) => [...prev, { role: "assistant", content: d.reply }]);
        onTaught();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-lg font-bold">Teach your panda</h2>
      <p className="mb-3 text-xs opacity-50">
        The more it knows, the better it matches. Everything lands in &quot;what my
        panda knows&quot; below, delete anything, any time.
      </p>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {turns.map((t, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                t.role === "assistant"
                  ? "self-start bg-[#7C5CFF]/15"
                  : "self-end bg-white/10"
              }`}
            >
              {t.content}
            </div>
          ))}
          {busy && <div className="self-start rounded-2xl bg-[#7C5CFF]/15 px-4 py-2 text-sm opacity-60">thinking...</div>}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Tell your panda something..."
            className="w-full rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm"
          />
          <button
            onClick={send}
            disabled={busy || !draft.trim()}
            className="rounded-full bg-[#7C5CFF] px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
}

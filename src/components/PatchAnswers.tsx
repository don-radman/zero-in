"use client";
// Per-patch answer editor on the Panda Dash: add or adjust what you're looking
// for, logistics, the event question, and the intros opt-in after the fact
// (venue wifi insurance: the claim-time card is a one-shot moment).
import { useState } from "react";
import { authedFetch, devMode } from "@/lib/clientAuth";
import ConsentTap from "@/components/ConsentTap";

const HEADS_OUT = [
  ["", "Not sure yet"],
  ["saturday", "Tonight"],
  ["sunday", "Sunday"],
  ["monday", "Monday"],
  ["later", "Sticking around"],
] as const;

export default function PatchAnswers({
  eventId,
  askTheRoom,
  intent,
  hasTelegram,
  agentTokenId,
  getToken,
  onSaved,
}: {
  eventId: string;
  askTheRoom?: string | null;
  intent?: { looking_for?: string | null; logistics?: Record<string, string>; intros_enabled?: boolean };
  hasTelegram: boolean;
  agentTokenId: number | null;
  getToken: () => Promise<string | null>;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [lookingFor, setLookingFor] = useState(intent?.looking_for || "");
  const [headsOut, setHeadsOut] = useState(intent?.logistics?.flies_out || "");
  const [askRoomAnswer, setAskRoomAnswer] = useState("");
  const [introsEnabled, setIntrosEnabled] = useState(intent ? intent.intros_enabled !== false : true);
  const [telegram, setTelegram] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (introsEnabled && !hasTelegram && !telegram.trim()) {
      setError("Intros need a Telegram handle so your intro can reach you.");
      return;
    }
    setState("saving");
    try {
      const t = await getToken();
      const res = await authedFetch(
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
      if (!res.ok) throw new Error((await res.json()).error);
      setState("saved");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
      setState("idle");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-t border-white/10 px-3 py-2 text-left text-xs text-[#B7A5FF] hover:bg-white/5"
      >
        {intent ? "Edit my answers" : "Add my answers (helps your panda hunt)"}
      </button>
    );
  }

  return (
    <div className="border-t border-white/10 p-3 text-left">
      <label className="block">
        <span className="text-xs font-medium">What are you looking for here?</span>
        <input
          value={lookingFor}
          onChange={(e) => setLookingFor(e.target.value)}
          placeholder="Cofounder, first users, good conversations..."
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 p-2 text-sm"
        />
      </label>

      <label className="mt-2 block">
        <span className="text-xs font-medium">When do you head out?</span>
        <select
          value={headsOut}
          onChange={(e) => setHeadsOut(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 p-2 text-sm"
        >
          {HEADS_OUT.map(([v, label]) => (
            <option key={v} value={v} className="bg-[#0a0a14]">
              {label}
            </option>
          ))}
        </select>
      </label>

      {askTheRoom && (
        <label className="mt-2 block">
          <span className="text-xs font-medium">{askTheRoom}</span>
          <input
            value={askRoomAnswer}
            onChange={(e) => setAskRoomAnswer(e.target.value)}
            placeholder="Optional, anonymous to the host"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 p-2 text-sm"
          />
        </label>
      )}

      <label className="mt-3 flex cursor-pointer items-center justify-between rounded-lg border border-white/10 p-2">
        <span className="text-xs">Let my panda introduce me at this event</span>
        <input
          type="checkbox"
          checked={introsEnabled}
          onChange={(e) => setIntrosEnabled(e.target.checked)}
          className="h-4 w-4 accent-[#7C5CFF]"
        />
      </label>

      {introsEnabled && !hasTelegram && (
        <input
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
          placeholder="@telegram (so intros reach you)"
          className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 p-2 text-sm"
        />
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={state === "saving"}
          className="rounded-full bg-[#7C5CFF] px-5 py-1.5 text-sm font-semibold hover:opacity-90 disabled:opacity-40"
        >
          {state === "saving" ? "Saving..." : state === "saved" ? "Saved" : "Save"}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs opacity-50 hover:opacity-90">
          close
        </button>
      </div>

      {state === "saved" && introsEnabled && agentTokenId !== null && !devMode() && (
        <div className="mt-3">
          <ConsentTap tokenId={agentTokenId} getToken={getToken} />
        </div>
      )}
    </div>
  );
}

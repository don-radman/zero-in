"use client";
// The Debrief: 3 questions from your panda the morning after (demo: 2 min).
// Completing upgrades the patch and unlocks more intros.
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/clientAuth";

export default function DebriefPrompt({ getToken, onDone }: { getToken: () => Promise<string | null>; onDone: () => void }) {
  const [eligible, setEligible] = useState<any[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [active, setActive] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [done, setDone] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      const res = await authedFetch("/api/debrief", {}, t);
      const d = await res.json();
      if (res.ok) {
        setEligible(d.eligible || []);
        setQuestions(d.questions || []);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(finalAnswers: string[]) {
    const t = await getToken();
    const res = await authedFetch(
      "/api/debrief",
      { method: "POST", body: JSON.stringify({ eventId: active.eventId, answers: finalAnswers }) },
      t
    );
    const d = await res.json();
    if (res.ok) {
      setDone(d);
      setActive(null);
      onDone();
    }
  }

  function next() {
    const updated = [...answers, draft];
    setAnswers(updated);
    setDraft("");
    if (step + 1 < questions.length) {
      setStep(step + 1);
    } else {
      submit(updated);
    }
  }

  if (done) {
    return (
      <section className="mt-10 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
        <p className="font-semibold">Debrief complete. Patch upgraded.</p>
        <p className="text-sm opacity-70">+10 gravity (total {done.gravity}, {done.tier}). Your panda is on the hunt again.</p>
      </section>
    );
  }

  if (active) {
    return (
      <section className="mt-10 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
        <p className="text-[10px] uppercase tracking-wider opacity-50">Debrief {step + 1} of {questions.length}: {active.eventName}</p>
        <p className="mt-2 font-medium">{questions[step]}</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          className="mt-3 w-full rounded-lg border border-white/15 bg-black/30 p-3 text-sm"
          placeholder="Tell your panda..."
        />
        <button onClick={next} className="mt-2 rounded-full bg-amber-400 px-6 py-2 text-sm font-semibold text-black hover:opacity-90">
          {step + 1 < questions.length ? "Next" : "Finish debrief"}
        </button>
      </section>
    );
  }

  if (eligible.length === 0) return null;

  return (
    <section className="mt-10 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
      <p className="font-semibold">Your panda wants a debrief</p>
      <p className="text-sm opacity-70">3 quick questions about {eligible[0].eventName}. Finishes your patch, +10 gravity.</p>
      <button
        onClick={() => { setActive(eligible[0]); setStep(0); setAnswers([]); }}
        className="mt-3 rounded-full bg-amber-400 px-6 py-2 text-sm font-semibold text-black hover:opacity-90"
      >
        Start
      </button>
    </section>
  );
}

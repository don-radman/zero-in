"use client";
// Socials on the Panda Dash. Private by default; a handle is only ever shown
// to one person at a time, after a mutual intro yes.
import { useState } from "react";
import { authedFetch } from "@/lib/clientAuth";

const FIELDS = ["telegram", "x", "github", "linkedin"] as const;

export default function SocialsEditor({
  initial,
  getToken,
}: {
  initial: Record<string, string>;
  getToken: () => Promise<string | null>;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    telegram: initial.telegram || "",
    x: initial.x || "",
    github: initial.github || "",
    linkedin: initial.linkedin || "",
  });
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function save() {
    setState("saving");
    const t = await getToken();
    const res = await authedFetch("/api/socials", { method: "POST", body: JSON.stringify(values) }, t);
    setState(res.ok ? "saved" : "idle");
    if (res.ok) setTimeout(() => setState("idle"), 2000);
  }

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-lg font-bold">Your handles</h2>
      <p className="mb-3 text-xs opacity-50">
        Private by default. Shared only with a person you both said yes to.
        Telegram is how intros reach you.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map((k) => (
          <input
            key={k}
            value={values[k]}
            onChange={(e) => setValues({ ...values, [k]: e.target.value })}
            placeholder={`@${k}`}
            className="rounded-lg border border-white/15 bg-white/5 p-2 text-sm"
          />
        ))}
      </div>
      <button
        onClick={save}
        disabled={state === "saving"}
        className="mt-3 rounded-full border border-[#7C5CFF] px-6 py-2 text-sm font-semibold text-[#B7A5FF] hover:bg-[#7C5CFF]/10 disabled:opacity-40"
      >
        {state === "saving" ? "Saving..." : state === "saved" ? "Saved" : "Save handles"}
      </button>
    </section>
  );
}

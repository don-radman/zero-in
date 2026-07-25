"use client";
// Onboarding: three light questions (country, world, favorite color) then the
// launch. "What are you looking for" and intro consent moved to the zero-in
// moment (claim time), where they have context.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/clientAuth";
import { COUNTRIES, flagUrl } from "@/lib/countries";

const WORLDS = [
  ["builder", "Building / shipping"],
  ["founder", "Founder"],
  ["defi", "DeFi"],
  ["vc", "VC / investing"],
  ["marketing", "Marketing"],
  ["operations", "Operations"],
  ["community", "Community / events"],
  ["artist", "Art / design"],
  ["researcher", "Research"],
  ["gaming", "Gaming"],
] as const;

const COLORS = [
  ["red", "#E5484D"],
  ["orange", "#FF8A3D"],
  ["yellow", "#F5C518"],
  ["green", "#4CC26B"],
  ["teal", "#18B8A6"],
  ["blue", "#3B82F6"],
  ["purple", "#7C5CFF"],
  ["pink", "#F464A8"],
  ["silver", "#8A93A6"],
] as const;

export type OnboardAuth = {
  ready: boolean;
  getAccessToken: () => Promise<string | null>;
  email: string | null;
};

const SUITING_LINES = [
  "Your panda is suiting up...",
  "Stitching the suit in your color...",
  "Calibrating the visor...",
  "Raising your flag...",
  "Packing the mission backpack...",
  "Reserving blank patch slots on the shoulder...",
  "Final checks. Almost there...",
];

function SuitingUp() {
  const [line, setLine] = useState(0);
  // Portrait generation takes ~30s; keep the wait alive.
  useEffect(() => {
    const t = setInterval(() => setLine((l) => (l + 1) % SUITING_LINES.length), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative flex min-h-[60vh] flex-col items-center justify-center gap-6 overflow-hidden py-24 text-center">
      <span className="chase-panda a" style={{ left: "10%", top: "20%" }}>🐼</span>
      <span className="chase-panda b" style={{ left: "12%", top: "62%" }}>🐼</span>
      <div className="h-24 w-24 animate-pulse rounded-full bg-gradient-to-br from-[#7C5CFF] to-[#18B8A6]" />
      <p className="text-lg opacity-80">{SUITING_LINES[line]}</p>
      <p className="text-xs opacity-40">Every panda is generated once, just for you. Worth the ~30 seconds.</p>
    </div>
  );
}

export default function OnboardFlow({ auth, next }: { auth: OnboardAuth; next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"questions" | "hatching" | "hatched">("questions");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const [country, setCountry] = useState("PT");
  const [worlds, setWorlds] = useState<string[]>([]);
  const [otherOn, setOtherOn] = useState(false);
  const [worldOther, setWorldOther] = useState("");
  const [palette, setPalette] = useState("purple");
  const [socials, setSocials] = useState({ x: "", github: "", telegram: "" });

  function toggleWorld(w: string) {
    setWorlds((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));
  }

  async function submit() {
    setError(null);
    setStep("hatching");
    try {
      const token = await auth.getAccessToken();
      const res = await authedFetch(
        "/api/onboard",
        {
          method: "POST",
          body: JSON.stringify({
            country,
            worlds,
            worldOther: otherOn && worldOther.trim() ? worldOther.trim() : undefined,
            palette,
            vibe: "curious",
            socials: Object.fromEntries(Object.entries(socials).filter(([, v]) => v.trim())),
          }),
        },
        token
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "launch failed");
      setResult(data);
      setStep("hatched");
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong");
      setStep("questions");
    }
  }

  if (step === "hatching") {
    return <SuitingUp />;
  }

  if (step === "hatched" && result) {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <p className="text-sm uppercase tracking-widest text-[#7C5CFF]">Genesis</p>
        <h1 className="text-3xl font-bold">Your panda has launched</h1>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.agent.panda_image_url} alt="Your panda" className="h-64 w-64 rounded-3xl object-cover" />
          {result.agent.panda_fallback && (
            // AI portraits include the real flag; overlay only on SVG fallback
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={flagUrl(country)}
              alt={country}
              className="absolute -right-2 -top-2 h-8 rounded border-2 border-white shadow"
            />
          )}
        </div>
        {result.mint ? (
          <a href={result.mint.explorer} target="_blank" className="text-xs text-[#18B8A6] underline">
            Agentic ID minted on 0G (view transaction)
          </a>
        ) : (
          <p className="text-xs opacity-50">Mint queued (contracts landing soon)</p>
        )}
        <button
          onClick={() => router.push(next || "/me")}
          className="mt-2 rounded-full bg-[#7C5CFF] px-8 py-3 font-semibold hover:opacity-90"
        >
          {next ? "Back to your patch" : "Meet your panda"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-7 py-8">
      <div>
        <h1 className="text-2xl font-bold">Three quick questions</h1>
        <p className="text-sm opacity-60">They shape how your panda looks.</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Where are you from?</span>
        <div className="flex items-center gap-3">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 p-3"
          >
            {COUNTRIES.map(([code, name]) => (
              <option key={code} value={code} className="bg-[#0a0a14]">
                {name}
              </option>
            ))}
          </select>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagUrl(country)} alt={country} className="h-6 rounded-sm" />
        </div>
        <span className="text-xs opacity-45">Your flag rides on your panda&apos;s backpack, and its suit trim picks up your flag&apos;s colors.</span>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">What is your world?</span>
        <div className="flex flex-wrap gap-2">
          {WORLDS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => toggleWorld(v)}
              className={`rounded-full border px-4 py-2 text-sm ${
                worlds.includes(v) ? "border-[#7C5CFF] bg-[#7C5CFF]/20" : "border-white/15 hover:border-white/30"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOtherOn(!otherOn)}
            className={`rounded-full border px-4 py-2 text-sm ${
              otherOn ? "border-[#7C5CFF] bg-[#7C5CFF]/20" : "border-white/15 hover:border-white/30"
            }`}
          >
            Other
          </button>
        </div>
        {otherOn && (
          <input
            value={worldOther}
            onChange={(e) => setWorldOther(e.target.value)}
            placeholder="Tell us your world..."
            className="rounded-lg border border-white/15 bg-white/5 p-3"
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Pick your favorite color</span>
        <div className="flex flex-wrap gap-3">
          {COLORS.map(([name, hex]) => (
            <button
              key={name}
              type="button"
              onClick={() => setPalette(name)}
              title={name}
              className={`h-10 w-10 rounded-full border-2 transition ${
                palette === name ? "scale-110 border-white" : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: hex }}
              aria-label={name}
            />
          ))}
        </div>
        <span className="text-xs opacity-45">Highlights in your panda&apos;s fur and suit.</span>
      </div>

      <details className="rounded-lg border border-white/10 p-3">
        <summary className="cursor-pointer text-sm opacity-70">Socials (optional)</summary>
        <div className="mt-3 flex flex-col gap-2">
          {(["x", "github", "telegram"] as const).map((k) => (
            <input
              key={k}
              value={socials[k]}
              onChange={(e) => setSocials({ ...socials, [k]: e.target.value })}
              placeholder={`@${k} handle`}
              className="rounded-lg border border-white/15 bg-white/5 p-2 text-sm"
            />
          ))}
          <span className="text-xs opacity-45">
            Private by default: never public, never shown to the host. Only shared
            with one person at a time, after you BOTH say yes to an intro.
          </span>
        </div>
      </details>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={!auth.ready}
        className="rounded-full bg-[#7C5CFF] px-8 py-3 font-semibold hover:opacity-90 disabled:opacity-40"
      >
        Launch my Panda
      </button>
    </div>
  );
}

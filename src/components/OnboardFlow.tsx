"use client";
// The onboarding flow: 4 questions + optional socials -> the hatch.
// Auth is injected (Privy or dev email) so the flow itself stays identical.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authedFetch, devMode } from "@/lib/clientAuth";
import { COUNTRIES, flagUrl } from "@/lib/countries";
import ConsentTap from "@/components/ConsentTap";

const INTERESTS = [
  ["builder", "Building / shipping"],
  ["defi", "DeFi / onchain finance"],
  ["artist", "Art / design"],
  ["researcher", "Research"],
  ["community", "Community / events"],
  ["gaming", "Gaming"],
] as const;

const PALETTES = [
  ["cosmic-purple", "#7C5CFF"],
  ["nebula-teal", "#18B8A6"],
  ["solar-orange", "#FF8A3D"],
  ["aurora-green", "#4CC26B"],
  ["plasma-pink", "#F464A8"],
  ["lunar-gray", "#8A93A6"],
] as const;

const CONSENT = [
  ["event", "This event only", "Your panda only matches you with people at events you zero in at"],
  ["community", "Community-wide", "Your panda can also match you across the whole community"],
  ["off", "No intros", "Patches and memory only; your panda introduces you to no one"],
] as const;

export type OnboardAuth = {
  ready: boolean;
  getAccessToken: () => Promise<string | null>;
  email: string | null;
};

export default function OnboardFlow({ auth, next }: { auth: OnboardAuth; next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"questions" | "hatching" | "hatched">("questions");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const [country, setCountry] = useState("PT");
  const [interest, setInterest] = useState("builder");
  const [building, setBuilding] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [consent, setConsent] = useState("event");
  const [palette, setPalette] = useState("cosmic-purple");
  const [socials, setSocials] = useState({ x: "", github: "", telegram: "" });

  async function submit() {
    setError(null);
    if (!building.trim() || !lookingFor.trim()) {
      setError("Your panda needs both answers to find your people.");
      return;
    }
    setStep("hatching");
    try {
      const token = await auth.getAccessToken();
      const res = await authedFetch(
        "/api/onboard",
        {
          method: "POST",
          body: JSON.stringify({
            country,
            interest,
            building: building.trim(),
            lookingFor: lookingFor.trim(),
            consentScope: consent,
            palette,
            vibe: "curious",
            socials: Object.fromEntries(Object.entries(socials).filter(([, v]) => v.trim())),
          }),
        },
        token
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "onboarding failed");
      setResult(data);
      setStep("hatched");
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong");
      setStep("questions");
    }
  }

  if (step === "hatching") {
    return (
      <div className="flex flex-col items-center gap-6 py-24 text-center">
        <div className="h-24 w-24 animate-pulse rounded-full bg-gradient-to-br from-[#7C5CFF] to-[#18B8A6]" />
        <p className="text-lg opacity-80">Your panda is suiting up...</p>
      </div>
    );
  }

  if (step === "hatched" && result) {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <p className="text-sm uppercase tracking-widest text-[#7C5CFF]">Genesis</p>
        <h1 className="text-3xl font-bold">Your panda has hatched</h1>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.agent.panda_image_url} alt="Your panda" className="h-64 w-64 rounded-3xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={flagUrl(country)}
            alt={country}
            className="absolute -right-2 -top-2 h-8 rounded border-2 border-white shadow"
          />
        </div>
        {result.mint ? (
          <a href={result.mint.explorer} target="_blank" className="text-xs text-[#18B8A6] underline">
            Agentic ID minted on 0G (view transaction)
          </a>
        ) : (
          <p className="text-xs opacity-50">Mint queued (contracts landing soon)</p>
        )}
        {result.mint?.tokenId !== undefined && result.mint?.tokenId !== null && !devMode() && (
          <ConsentTap tokenId={result.mint.tokenId} getToken={auth.getAccessToken} />
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
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Four quick questions</h1>
        <p className="text-sm opacity-60">Each one helps your panda find your people.</p>
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
        <span className="text-xs opacity-45">Your flag rides on your panda&apos;s backpack.</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">What are you building or into?</span>
        <select
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          className="rounded-lg border border-white/15 bg-white/5 p-3"
        >
          {INTERESTS.map(([v, label]) => (
            <option key={v} value={v} className="bg-[#0a0a14]">
              {label}
            </option>
          ))}
        </select>
        <input
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          placeholder="One line: what exactly?"
          className="rounded-lg border border-white/15 bg-white/5 p-3"
        />
        <span className="text-xs opacity-45">Helps your panda find your people.</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">What are you looking for?</span>
        <input
          value={lookingFor}
          onChange={(e) => setLookingFor(e.target.value)}
          placeholder="Cofounder, first users, a grant, good conversations..."
          className="rounded-lg border border-white/15 bg-white/5 p-3"
        />
        <span className="text-xs opacity-45">Helps your panda find your people.</span>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Intros</span>
        {CONSENT.map(([v, label, why]) => (
          <label key={v} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${consent === v ? "border-[#7C5CFF] bg-[#7C5CFF]/10" : "border-white/15"}`}>
            <input type="radio" checked={consent === v} onChange={() => setConsent(v)} className="mt-1" />
            <span>
              <span className="block text-sm font-medium">{label}</span>
              <span className="block text-xs opacity-50">{why}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Pick your suit colors</span>
        <div className="flex gap-3">
          {PALETTES.map(([name, hex]) => (
            <button
              key={name}
              onClick={() => setPalette(name)}
              className={`h-9 w-9 rounded-full border-2 ${palette === name ? "border-white" : "border-transparent"}`}
              style={{ backgroundColor: hex }}
              aria-label={name}
            />
          ))}
        </div>
      </div>

      <details className="rounded-lg border border-white/10 p-3">
        <summary className="cursor-pointer text-sm opacity-70">Socials (optional, plain text)</summary>
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
        </div>
      </details>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={!auth.ready}
        className="rounded-full bg-[#7C5CFF] px-8 py-3 font-semibold hover:opacity-90 disabled:opacity-40"
      >
        Hatch my panda
      </button>
    </div>
  );
}

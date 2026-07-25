"use client";
// Onboarding entry: Privy email auth when configured, dev email fallback
// before keys exist. The flow itself lives in OnboardFlow.
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import OnboardFlow, { OnboardAuth } from "@/components/OnboardFlow";
import { devMode, getDevEmail, setDevEmail } from "@/lib/clientAuth";

function PrivyGate({ next }: { next?: string }) {
  const { ready, authenticated, login, getAccessToken, user } = usePrivy();

  if (!ready) return <p className="py-24 text-center opacity-60">Warming up...</p>;
  if (!authenticated) {
    return (
      <div className="flex flex-col items-center gap-5 py-24 text-center">
        <h1 className="text-3xl font-bold">Zero in</h1>
        <p className="max-w-sm opacity-70">
          One email. No wallet, no seed phrase, no gas. Your panda handles the rest.
        </p>
        <button onClick={login} className="rounded-full bg-[#7C5CFF] px-8 py-3 font-semibold hover:opacity-90">
          Start with email
        </button>
      </div>
    );
  }

  const auth: OnboardAuth = {
    ready: true,
    getAccessToken,
    email: user?.email?.address ?? null,
  };
  return <OnboardFlow auth={auth} next={next} />;
}

function DevGate({ next }: { next?: string }) {
  const [email, setEmail] = useState(getDevEmail() || "");
  const [confirmed, setConfirmed] = useState(!!getDevEmail());

  if (!confirmed) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Zero in</h1>
        <p className="text-xs text-amber-400">dev mode (Privy not configured)</p>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-72 rounded-lg border border-white/15 bg-white/5 p-3 text-center"
        />
        <button
          onClick={() => {
            if (email.includes("@")) {
              setDevEmail(email);
              setConfirmed(true);
            }
          }}
          className="rounded-full bg-[#7C5CFF] px-8 py-3 font-semibold hover:opacity-90"
        >
          Continue
        </button>
      </div>
    );
  }

  const auth: OnboardAuth = { ready: true, getAccessToken: async () => null, email };
  return <OnboardFlow auth={auth} next={next} />;
}

function OnboardInner() {
  const params = useSearchParams();
  const next = params.get("next") || undefined;
  return devMode() ? <DevGate next={next} /> : <PrivyGate next={next} />;
}

export default function OnboardPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6">
      <Suspense>
        <OnboardInner />
      </Suspense>
    </main>
  );
}

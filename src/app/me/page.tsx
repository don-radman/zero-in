"use client";
// Member profile: the panda, the suit (patches), gravity + tier, and the
// "what my panda knows" transparency screen (view + delete every stored fact).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { authedFetch, devMode, getDevEmail } from "@/lib/clientAuth";
import { flagUrl } from "@/lib/countries";
import SuggestionCards from "@/components/SuggestionCards";
import DebriefPrompt from "@/components/DebriefPrompt";
import TeachPanda from "@/components/TeachPanda";
import SocialsEditor from "@/components/SocialsEditor";

function useAuthToken() {
  if (devMode()) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return { ready: true, authed: !!getDevEmail(), get: async () => null as string | null };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { ready, authenticated, getAccessToken } = usePrivy();
  return { ready, authed: authenticated, get: getAccessToken };
}

export default function MePage() {
  const router = useRouter();
  const auth = useAuthToken();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const t = await auth.get();
    const res = await authedFetch("/api/me", {}, t);
    const d = await res.json();
    if (res.status === 404) {
      router.push("/onboard");
      return;
    }
    if (!res.ok) throw new Error(d.error);
    setData(d);
  }

  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.authed) {
      router.push("/onboard");
      return;
    }
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.ready, auth.authed]);

  async function forget(id: string) {
    const t = await auth.get();
    await authedFetch(`/api/memories/${id}`, { method: "DELETE" }, t);
    load().catch(() => {});
  }

  if (error) return <main className="p-10 text-center text-red-400">{error}</main>;
  if (!data) return <main className="p-10 text-center opacity-60">Calling your panda...</main>;

  const { agent, user, patches, memories, nextTier } = data;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
      <p className="mb-6 text-center text-sm uppercase tracking-[0.25em] text-[#7C5CFF]">Panda Dash</p>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={agent.panda_image_url} alt="Your panda" className="h-56 w-56 rounded-3xl object-cover" />
          {agent.panda_fallback && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={flagUrl(user.country || "pt")} alt={user.country} className="absolute -right-2 -top-2 h-8 rounded border-2 border-white shadow" />
          )}
        </div>
        <div>
          <p className="text-sm uppercase tracking-widest text-[#7C5CFF]">{agent.tier}</p>
          <p className="text-4xl font-black">{agent.gravity} <span className="text-lg font-medium opacity-50">gravity</span></p>
          {nextTier && (
            <p className="mt-1 text-xs opacity-50">{nextTier.needed} more to {nextTier.name}</p>
          )}
        </div>
        <p className="max-w-md text-sm opacity-60">
          Gravity is your pull. Show up, connect, follow through, and things get
          drawn to you: +20 for a patch (+30 flagship), +10 per intro made, +10
          per debrief, +2 for telling your panda what you seek.
        </p>
        {agent.mint_tx && (
          <a
            href={`${process.env.NEXT_PUBLIC_EXPLORER || "https://chainscan-galileo.0g.ai"}/tx/${agent.mint_tx}`}
            target="_blank"
            className="text-xs text-[#18B8A6] underline"
          >
            Agentic ID on 0G
          </a>
        )}
      </div>

      <DebriefPrompt getToken={auth.get} onDone={() => load().catch(() => {})} />
      <SuggestionCards getToken={auth.get} />

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">The suit</h2>
        {patches.length === 0 ? (
          <p className="text-sm opacity-50">No patches yet. Find a tag and zero in.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {patches.map((p: any, i: number) => (
              <div key={i} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {p.events?.patch_art_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.events.patch_art_url} alt={p.events?.name} className="aspect-[3/2] w-full object-cover" />
                )}
                <div className="p-3">
                  <p className="font-semibold">{p.events?.name}</p>
                  <p className="text-sm opacity-60">
                    #{p.edition}
                    {p.events?.cap ? ` of ${p.events.cap}` : ""}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider opacity-40">{p.events?.trust_tier}-attested</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <TeachPanda getToken={auth.get} onTaught={() => load().catch(() => {})} />
      <SocialsEditor initial={user.socials || {}} getToken={auth.get} />

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-bold">What my panda knows</h2>
        <p className="mb-3 text-xs opacity-50">
          Everything below is stored encrypted; delete anything, any time.
        </p>
        <ul className="flex flex-col gap-2">
          {memories.map((m: any) => (
            <li key={m.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 p-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#7C5CFF]">{m.kind}</p>
                <p className="text-sm">{m.summary}</p>
              </div>
              <button onClick={() => forget(m.id)} className="text-xs opacity-40 hover:text-red-400 hover:opacity-100">
                forget
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

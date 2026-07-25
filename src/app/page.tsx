import Link from "next/link";

// Deterministic starfield (seeded by index, stable across renders).
function stars(count: number) {
  const rand = (i: number, salt: number) => {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  return Array.from({ length: count }, (_, i) => ({
    left: `${(rand(i, 1) * 100).toFixed(2)}%`,
    top: `${(rand(i, 2) * 100).toFixed(2)}%`,
    size: 1 + rand(i, 3) * 2.2,
    delay: `${(rand(i, 4) * 4).toFixed(2)}s`,
    duration: `${(3 + rand(i, 5) * 4).toFixed(2)}s`,
    min: 0.15 + rand(i, 6) * 0.25,
    max: 0.7 + rand(i, 7) * 0.3,
  }));
}

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-10 text-center">
      {/* deep space backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,92,255,0.22), transparent 70%)," +
            "radial-gradient(ellipse 60% 40% at 85% 110%, rgba(24,184,166,0.14), transparent 70%)," +
            "radial-gradient(ellipse 50% 35% at 10% 90%, rgba(124,92,255,0.10), transparent 70%)",
        }}
      />
      {stars(90).map((s, i) => (
        <span
          key={i}
          className="star"
          style={
            {
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              animationDuration: s.duration,
              "--star-min": s.min,
              "--star-max": s.max,
            } as React.CSSProperties
          }
        />
      ))}

      <div className="relative flex min-h-[46vh] flex-col items-center justify-center gap-4 pt-6">
        <h1 className="bg-gradient-to-br from-white via-white to-[#7C5CFF] bg-clip-text text-6xl font-black tracking-tight text-transparent sm:text-7xl">
          ZERO-IN
        </h1>
        <p className="max-w-xl text-lg font-medium sm:text-xl">
          Claim Patches. Gain Gravity. Attract your People.
        </p>
        <p className="text-sm opacity-40">Zero degrees of separation.</p>
        <Link
          href="/onboard"
          className="mt-4 rounded-full bg-[#7C5CFF] px-10 py-4 text-lg font-semibold shadow-[0_0_40px_rgba(124,92,255,0.45)] transition hover:scale-[1.03] hover:opacity-95"
        >
          Launch Your Panda
        </Link>
        <a href="#how" className="mt-3 text-xs uppercase tracking-[0.2em] opacity-40 transition hover:opacity-80">
          How it works ↓
        </a>
      </div>

      <section id="how" className="relative mx-auto mt-4 w-full max-w-3xl">
        <h2 className="text-center text-sm uppercase tracking-[0.25em] text-[#7C5CFF]">How it works</h2>
        <div className="mt-6 grid gap-4 text-left sm:grid-cols-2">
          {[
            [
              "01",
              "Launch your Panda",
              "One email. No wallet, no seed phrase, no gas. You get a one-of-one astronaut panda: your personal AI agent, minted as an Agentic ID on 0G.",
            ],
            [
              "02",
              "Zero-In at events",
              "Tap the tag at the door. A numbered patch gets sewn onto your suit, on-chain, and your Gravity climbs.",
            ],
            [
              "03",
              "Your panda hunts",
              "Tell it what you're looking for. It learns privately: memory encrypted on 0G Storage, only fingerprints on-chain, and it scans the room on 0G Compute.",
            ],
            [
              "04",
              "Panda Connections",
              "When two pandas find a match, both humans get asked. Only a double yes makes it a Panda Connection: the intro lands with the reason and a time, zero cold approaches.",
            ],
          ].map(([n, title, body]) => (
            <div key={n} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-bold text-[#7C5CFF]">{n}</p>
              <p className="mt-1 font-bold">{title}</p>
              <p className="mt-2 text-sm leading-relaxed opacity-70">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
          <p className="text-sm font-bold">Gravity is your pull</p>
          <p className="mt-2 text-sm opacity-70">
            +20 patch claim · +10 intro made · +10 event pulse · +2 telling your panda what you seek
          </p>
          <p className="mt-2 text-xs tracking-wide opacity-45">Cadet -&gt; Explorer -&gt; Voyager -&gt; Legend</p>
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-sm italic opacity-60">
          &quot;We don&apos;t ask you to trust Zero-In with your data. The token standard
          makes it impossible for Zero-In to have it.&quot;
        </p>
        <p className="mb-6 mt-10 text-center text-xs opacity-30">
          Built on 0G: Chain, Compute, Storage, Agentic ID (ERC-7857 + ERC-8004)
        </p>
      </section>
    </main>
  );
}

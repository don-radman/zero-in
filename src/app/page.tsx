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
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
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

      <div className="relative flex flex-col items-center gap-6">
        <h1 className="bg-gradient-to-br from-white via-white to-[#7C5CFF] bg-clip-text text-7xl font-black tracking-tight text-transparent sm:text-8xl">
          ZERO-IN
        </h1>
        <p className="max-w-xl text-xl font-medium sm:text-2xl">
          Claim Patches. Gain Gravity. Attract your People.
        </p>
        <p className="text-sm opacity-40">Zero degrees of separation.</p>
        <Link
          href="/onboard"
          className="mt-6 rounded-full bg-[#7C5CFF] px-10 py-4 text-lg font-semibold shadow-[0_0_40px_rgba(124,92,255,0.45)] transition hover:scale-[1.03] hover:opacity-95"
        >
          Launch Your Panda
        </Link>
        <p className="mt-12 text-xs opacity-30">
          Built on 0G: Chain, Compute, Storage, Agentic ID (ERC-7857 + ERC-8004)
        </p>
      </div>
    </main>
  );
}

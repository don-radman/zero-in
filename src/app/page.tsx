import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-[#7C5CFF]">Zero-In</p>
      <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-5xl">
        The presence layer for communities
      </h1>
      <p className="max-w-xl text-lg opacity-70">
        Show up. Earn the patch. Meet the right three people in the room.
        Your panda remembers everyone so you do not have to.
      </p>
      <p className="text-sm opacity-40">Zero degrees of separation.</p>
      <div className="mt-4 flex gap-4">
        <Link href="/onboard" className="rounded-full bg-[#7C5CFF] px-8 py-3 font-semibold hover:opacity-90">
          Hatch your panda
        </Link>
        <Link href="/me" className="rounded-full border border-white/20 px-8 py-3 font-semibold hover:bg-white/5">
          Your suit
        </Link>
      </div>
      <p className="mt-10 text-xs opacity-30">Built on 0G: Chain, Compute, Storage, Agentic ID (ERC-7857 + ERC-8004)</p>
    </main>
  );
}

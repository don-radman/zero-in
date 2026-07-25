"use client";
// The consent moment: one tap, explained. The member signs an EIP-712
// permission slip in their embedded wallet (free, no gas), the relayer
// submits it on-chain. Only rendered when Privy is live (needs a real wallet).
import { useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { authedFetch } from "@/lib/clientAuth";

type Phase = "idle" | "signing" | "done" | "error";

export default function ConsentTap({
  tokenId,
  getToken,
}: {
  tokenId: string | number;
  getToken: () => Promise<string | null>;
}) {
  const { wallets } = useWallets();
  const [phase, setPhase] = useState<Phase>("idle");
  const [explorer, setExplorer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function consent() {
    setPhase("signing");
    setError(null);
    try {
      const t = await getToken();
      const res = await authedFetch(`/api/authorize?tokenId=${tokenId}`, {}, t);
      const { typedData, deadline, user, error: err } = await res.json();
      if (!res.ok) throw new Error(err || "could not prepare consent");

      const wallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
      if (!wallet) throw new Error("no wallet available yet, try again in a moment");
      const provider = await wallet.getEthereumProvider();
      const signature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [wallet.address, JSON.stringify(typedData)],
      });

      const submit = await authedFetch(
        "/api/authorize",
        { method: "POST", body: JSON.stringify({ tokenId, signature, deadline, user }) },
        t
      );
      const data = await submit.json();
      if (!submit.ok) throw new Error(data.error || "consent submission failed");
      setExplorer(data.explorer);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong");
      setPhase("error");
    }
  }

  if (phase === "done") {
    return (
      <div className="rounded-2xl border border-[#18B8A6]/40 bg-[#18B8A6]/10 p-4 text-center">
        <p className="font-semibold">Consent sealed on-chain</p>
        <p className="mt-1 text-xs opacity-60">
          Your panda can now hunt for your people. Revocable any time.
        </p>
        {explorer && (
          <a href={explorer} target="_blank" className="mt-1 inline-block text-xs text-[#18B8A6] underline">
            view the transaction
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#7C5CFF]/40 bg-[#7C5CFF]/10 p-4 text-center">
      <p className="font-semibold">One more tap</p>
      <p className="mx-auto mt-1 max-w-xs text-xs opacity-60">
        Sign a permission slip (free, no gas) that lets the matcher run your
        panda. It goes on-chain, and only you can grant or revoke it.
      </p>
      <button
        onClick={consent}
        disabled={phase === "signing"}
        className="mt-3 rounded-full bg-[#7C5CFF] px-6 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-40"
      >
        {phase === "signing" ? "Sealing..." : "Let my panda hunt"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

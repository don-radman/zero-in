"use client";
// Polls /api/qr-token and renders the rotating claim QR with a countdown ring.
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function ScreenQR({ eventId }: { eventId: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [msLeft, setMsLeft] = useState(45000);
  const deadline = useRef(Date.now() + 45000);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      const res = await fetch(`/api/qr-token/${eventId}`);
      const { claimUrl, msLeft } = await res.json();
      if (!alive) return;
      deadline.current = Date.now() + msLeft;
      setDataUrl(
        await QRCode.toDataURL(claimUrl, {
          width: 420,
          margin: 1,
          color: { dark: "#0a0a14", light: "#ffffff" },
        })
      );
      setTimeout(refresh, msLeft + 250);
    }

    refresh();
    const tick = setInterval(() => setMsLeft(Math.max(0, deadline.current - Date.now())), 200);
    return () => {
      alive = false;
      clearInterval(tick);
    };
  }, [eventId]);

  if (!dataUrl) return <div className="h-[420px] w-[420px] animate-pulse rounded-3xl bg-white/10" />;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="Claim QR" className="rounded-3xl" />
      <div className="h-2 w-[420px] overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-[#7C5CFF] transition-[width] duration-200 ease-linear"
          style={{ width: `${(msLeft / 45000) * 100}%` }}
        />
      </div>
    </div>
  );
}

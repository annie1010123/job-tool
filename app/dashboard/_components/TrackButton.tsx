"use client";

import { useState } from "react";
import Link from "next/link";

export default function TrackButton({ jdId }: { jdId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleTrack() {
    setLoading(true);
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jdId, status: "watching" }),
    });
    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-green-600 font-medium">已收藏 ✓</span>
        <Link
          href="/saved"
          className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors"
        >
          去收藏區
        </Link>
      </div>
    );
  }

  return (
    <button
      onClick={handleTrack}
      disabled={loading}
      className="text-xs bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
    >
      {loading ? "收藏中…" : "收藏"}
    </button>
  );
}

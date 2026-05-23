"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const EXAMPLES = [
  "前端工程師，想做 SaaS 或電商產品，有 React 經驗",
  "專案管理實習生，有興趣 Agile/Scrum，時程管控",
  "數據分析師，熟悉 Python/SQL，想進金融或科技業",
];

export default function IntentPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    fetch("/api/intent")
      .then((r) => r.json())
      .then((d) => { if (d.rawInput) setInput(d.rawInput); })
      .catch(() => null);
  }, []);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit() {
    if (!input.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    const resp = await fetch("/api/intent/expand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawInput: input.trim() }),
    });
    const data = await resp.json();

    if (!resp.ok) {
      setStatus("error");
      setErrorMsg(data.error ?? "儲存失敗");
      return;
    }
    setStatus("done");
    setKeywords(data.expandedKeywords ?? []);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-sm border border-zinc-100">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <span className="rounded-full bg-zinc-200 text-zinc-500 px-2.5 py-0.5 font-medium">1</span>
          <span className="text-zinc-400">上傳履歷</span>
          <span className="text-zinc-300">—</span>
          <span className="rounded-full bg-zinc-900 text-white px-2.5 py-0.5 font-medium">2</span>
          <span className="font-medium text-zinc-900">求職意圖</span>
        </div>

        <h1 className="text-xl font-semibold text-zinc-900 mb-1">你在找什麼樣的工作？</h1>
        <p className="text-sm text-zinc-500 mb-6">
          用一兩句話描述你的目標，AI 會展開成搜尋關鍵字，每天從 104 幫你篩選最相關的職缺
        </p>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="例：前端工程師，想做 SaaS 或電商產品，有 React 經驗"
          rows={4}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm resize-none outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 mb-3"
        />

        {/* Examples */}
        <div className="mb-4">
          <p className="text-xs text-zinc-400 mb-2">範例：</p>
          <div className="flex flex-col gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setInput(ex)}
                className="text-left text-xs text-zinc-500 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 rounded px-2 py-1 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && <p className="text-sm text-red-500 mb-3">{errorMsg}</p>}

        {status === "done" && keywords.length > 0 && (
          <div className="rounded-lg bg-green-50 border border-green-100 p-3 mb-4">
            <p className="text-sm font-medium text-green-800 mb-2">展開的搜尋關鍵字：</p>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw) => (
                <span key={kw} className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-0.5">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!input.trim() || status === "loading" || status === "done"}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {status === "loading" ? "AI 展開關鍵字中…" : status === "done" ? "完成，前往儀表板…" : "儲存求職意圖"}
        </button>
      </div>
    </div>
  );
}

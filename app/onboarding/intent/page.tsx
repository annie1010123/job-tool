"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const EXAMPLES = [
  "專案管理實習生，有興趣 Agile/Scrum，時程管控",
  "前端工程師，想做 SaaS 或電商產品，有 React 經驗",
  "數據分析師，熟悉 Python/SQL，想進金融或科技業",
];

export default function IntentPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "selecting" | "saving" | "done" | "error">("idle");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/intent")
      .then((r) => r.json())
      .then((d) => { if (d.rawInput) setInput(d.rawInput); })
      .catch(() => null);
  }, []);

  async function handleExpand() {
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
      setErrorMsg(data.error ?? "展開失敗");
      return;
    }

    const kws: string[] = data.expandedKeywords ?? [];
    setKeywords(kws);
    setSelected(new Set(kws));
    setStatus("selecting");
  }

  async function handleConfirm() {
    setStatus("saving");
    const selectedKeywords = keywords.filter((k) => selected.has(k));

    const resp = await fetch("/api/intent/expand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawInput: input.trim(), selectedKeywords }),
    });

    if (!resp.ok) {
      setStatus("error");
      setErrorMsg("儲存失敗");
      return;
    }

    setStatus("done");
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  const [customInput, setCustomInput] = useState("");

  function toggleKeyword(kw: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) { next.delete(kw); } else { next.add(kw); }
      return next;
    });
  }

  function addCustomKeyword() {
    const kw = customInput.trim();
    if (!kw || keywords.includes(kw)) { setCustomInput(""); return; }
    setKeywords((prev) => [...prev, kw]);
    setSelected((prev) => new Set([...prev, kw]));
    setCustomInput("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f3ee] py-12">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-sm border border-zinc-100">

        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-700 mb-6 inline-block transition-colors">
          ← 回主頁
        </Link>

        <h1 className="text-xl font-semibold text-zinc-900 mb-1">你在找什麼樣的工作？</h1>
        <p className="text-sm text-zinc-500 mb-6">
          用一兩句話描述你的目標，AI 會展開成搜尋關鍵字，每天從 104 幫你篩選最相關的職缺
        </p>

        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); if (status !== "idle") setStatus("idle"); }}
          placeholder="例：專案管理實習生，有興趣 Agile/Scrum，時程管控"
          rows={4}
          disabled={status === "selecting" || status === "saving" || status === "done"}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm resize-none outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 mb-3 disabled:bg-zinc-50"
        />

        {/* Examples */}
        {status === "idle" && (
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
        )}

        {errorMsg && <p className="text-sm text-red-500 mb-3">{errorMsg}</p>}

        {/* Keyword selection */}
        {(status === "selecting" || status === "saving" || status === "done") && keywords.length > 0 && (
          <div className="rounded-lg bg-zinc-50 border border-zinc-100 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-zinc-700">AI 展開的關鍵字</p>
              <p className="text-xs text-zinc-400">點擊取消不想要的</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => {
                const on = selected.has(kw);
                return (
                  <button
                    key={kw}
                    onClick={() => status === "selecting" && toggleKeyword(kw)}
                    className={`text-sm rounded-full px-3 py-1 transition-all border ${
                      on
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-400 border-zinc-200 line-through"
                    }`}
                  >
                    {kw}
                  </button>
                );
              })}
            </div>
            {/* Manual keyword input */}
            {status === "selecting" && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-200">
                <input
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomKeyword()}
                  placeholder="手動新增關鍵字…"
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                />
                <button
                  onClick={addCustomKeyword}
                  disabled={!customInput.trim()}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 transition-colors"
                >
                  + 新增
                </button>
              </div>
            )}

            <p className="text-xs text-zinc-400 mt-3">已選 {selected.size} / {keywords.length} 個關鍵字</p>
          </div>
        )}

        {/* Buttons */}
        {status === "idle" || status === "loading" || status === "error" ? (
          <button
            onClick={handleExpand}
            disabled={!input.trim() || status === "loading"}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
          >
            {status === "loading" ? "AI 展開關鍵字中…" : "產生關鍵字"}
          </button>
        ) : status === "selecting" ? (
          <div className="flex gap-2">
            <button
              onClick={() => setStatus("idle")}
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              重新輸入
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              確認，開始推薦
            </button>
          </div>
        ) : (
          <button disabled className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white opacity-40">
            {status === "saving" ? "儲存中…" : "完成，前往儀表板…"}
          </button>
        )}
      </div>
    </div>
  );
}

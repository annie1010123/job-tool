"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LOCATIONS = [
  "台北市", "新北市", "桃園市", "新竹市", "新竹縣",
  "台中市", "台南市", "高雄市", "其他",
];

interface Props {
  initialInput: string;
  initialKeywords: string[];
  initialLocations: string[];
  onClose: () => void;
}

export default function IntentEditModal({ initialInput, initialKeywords, initialLocations, onClose }: Props) {
  const router = useRouter();
  const [input, setInput] = useState(initialInput);
  const [status, setStatus] = useState<"idle" | "loading" | "selecting" | "saving" | "done" | "error">("idle");
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialKeywords));
  const [locations, setLocations] = useState<Set<string>>(new Set(initialLocations));
  const [errorMsg, setErrorMsg] = useState("");
  const [customInput, setCustomInput] = useState("");

  function toggleLocation(loc: string) {
    setLocations((prev) => {
      const next = new Set(prev);
      if (next.has(loc)) next.delete(loc);
      else next.add(loc);
      return next;
    });
  }

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
    const selectedLocations = Array.from(locations);

    const resp = await fetch("/api/intent/expand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawInput: input.trim(),
        selectedKeywords,
        locationFilter: selectedLocations,
      }),
    });

    if (!resp.ok) {
      setStatus("error");
      setErrorMsg("儲存失敗");
      return;
    }

    setStatus("done");
    setTimeout(() => {
      router.refresh();
      onClose();
    }, 800);
  }

  function toggleKeyword(kw: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
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

  const checkboxStyle = (on: boolean): React.CSSProperties => ({
    fontSize: 12, padding: "5px 12px", borderRadius: 8,
    border: on ? "1px solid #1a1a18" : "1px solid #e0dbd0",
    background: on ? "#1a1a18" : "#fff",
    color: on ? "#fff" : "#666",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget && status !== "loading" && status !== "saving") onClose(); }}
    >
      <div
        style={{
          background: "#fff", borderRadius: 16, padding: 28,
          width: "100%", maxWidth: 500, maxHeight: "85vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>編輯求職意圖</h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 18, color: "#aaa", cursor: "pointer", padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Job description */}
        <label style={{ fontSize: 13, fontWeight: 500, color: "#1a1a18", marginBottom: 6, display: "block" }}>
          你在找什麼樣的工作？
        </label>
        <p style={{ fontSize: 12, color: "#888780", marginBottom: 8 }}>
          用一兩句話描述你的目標，AI 會展開成搜尋關鍵字
        </p>
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); if (status !== "idle") setStatus("idle"); }}
          placeholder="例：專案管理實習生，有興趣 Agile/Scrum"
          rows={3}
          disabled={status === "selecting" || status === "saving" || status === "done"}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            border: "1px solid #e0dbd0", fontSize: 13, resize: "none",
            outline: "none", background: status !== "idle" ? "#fafaf8" : "#fff",
            marginBottom: 16,
          }}
        />

        {/* Location */}
        <label style={{ fontSize: 13, fontWeight: 500, color: "#1a1a18", marginBottom: 8, display: "block" }}>
          地區（可多選）
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {LOCATIONS.map((loc) => (
            <button
              key={loc}
              onClick={() => toggleLocation(loc)}
              style={checkboxStyle(locations.has(loc))}
            >
              {loc}
            </button>
          ))}
        </div>

        {errorMsg && <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{errorMsg}</p>}

        {/* Keywords */}
        {(status === "selecting" || status === "saving" || status === "done") && keywords.length > 0 && (
          <div style={{
            background: "#fafaf8", borderRadius: 12, border: "1px solid #e8e4db",
            padding: 16, marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>AI 展開的關鍵字</span>
              <span style={{ fontSize: 11, color: "#aaa" }}>點擊取消不想要的</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {keywords.map((kw) => {
                const on = selected.has(kw);
                return (
                  <button
                    key={kw}
                    onClick={() => status === "selecting" && toggleKeyword(kw)}
                    style={{
                      fontSize: 12, padding: "4px 12px", borderRadius: 20,
                      border: on ? "1px solid #1a1a18" : "1px solid #e0dbd0",
                      background: on ? "#1a1a18" : "#fff",
                      color: on ? "#fff" : "#aaa",
                      textDecoration: on ? "none" : "line-through",
                      cursor: status === "selecting" ? "pointer" : "default",
                      transition: "all 0.15s",
                    }}
                  >
                    {kw}
                  </button>
                );
              })}
            </div>
            {status === "selecting" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid #e8e4db" }}>
                <input
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomKeyword()}
                  placeholder="手動新增關鍵字…"
                  style={{
                    flex: 1, padding: "6px 12px", borderRadius: 8,
                    border: "1px solid #e0dbd0", fontSize: 12, outline: "none",
                  }}
                />
                <button
                  onClick={addCustomKeyword}
                  disabled={!customInput.trim()}
                  style={{
                    padding: "6px 12px", borderRadius: 8, border: "1px solid #e0dbd0",
                    fontSize: 12, color: "#666", background: "#fff", cursor: "pointer",
                    opacity: customInput.trim() ? 1 : 0.4,
                  }}
                >
                  + 新增
                </button>
              </div>
            )}
            <p style={{ fontSize: 11, color: "#aaa", marginTop: 10 }}>
              已選 {selected.size} / {keywords.length} 個關鍵字
            </p>
          </div>
        )}

        {/* Buttons */}
        {status === "idle" || status === "loading" || status === "error" ? (
          <button
            onClick={handleExpand}
            disabled={!input.trim() || status === "loading"}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 10,
              background: "#1a1a18", color: "#fff", fontSize: 13, fontWeight: 500,
              border: "none", cursor: "pointer",
              opacity: !input.trim() || status === "loading" ? 0.4 : 1,
            }}
          >
            {status === "loading" ? "AI 展開關鍵字中…" : "產生關鍵字"}
          </button>
        ) : status === "selecting" ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setStatus("idle")}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10,
                border: "1px solid #e0dbd0", background: "#fff",
                fontSize: 13, fontWeight: 500, color: "#666", cursor: "pointer",
              }}
            >
              重新輸入
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10,
                background: "#1a1a18", color: "#fff", border: "none",
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                opacity: selected.size === 0 ? 0.4 : 1,
              }}
            >
              確認儲存
            </button>
          </div>
        ) : (
          <button
            disabled
            style={{
              width: "100%", padding: "10px 0", borderRadius: 10,
              background: "#1a1a18", color: "#fff", fontSize: 13, fontWeight: 500,
              border: "none", opacity: 0.4,
            }}
          >
            {status === "saving" ? "儲存中…" : "✓ 已更新"}
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

export default function CoverLetterTryIt() {
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (jdText.trim().length < 20) {
      setError("請輸入至少 20 字的職缺描述");
      return;
    }
    setLoading(true);
    setError("");
    setResult("");

    const resp = await fetch("/api/cover-letter/try", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jdText }),
    });

    const data = await resp.json();
    setLoading(false);

    if (!resp.ok) {
      setError(data.error ?? "生成失敗");
      return;
    }
    setResult(data.coverLetter);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 16, padding: 24, maxWidth: 560, width: "100%" }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1a1a18", marginBottom: 4 }}>
        試試看：貼上職缺描述，AI 幫你寫推薦信
      </h3>
      <p style={{ fontSize: 12, color: "#888780", marginBottom: 16 }}>不需註冊，30 秒出結果</p>

      <textarea
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder="貼上 104 / LinkedIn / CakeResume 的職缺描述..."
        rows={5}
        style={{ width: "100%", padding: 12, borderRadius: 10, border: "0.5px solid rgba(0,0,0,0.15)", fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
      />

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          marginTop: 12, width: "100%", padding: "12px 0", borderRadius: 10,
          background: loading ? "#888" : "#1a1a18", color: "#fff",
          fontSize: 14, fontWeight: 500, border: "none", cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "AI 生成中..." : "生成推薦信 ✨"}
      </button>

      {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 16, padding: 16, background: "#f7f6f3", borderRadius: 10, position: "relative" }}>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: "#1a1a18", fontFamily: "inherit", margin: 0 }}>
            {result}
          </pre>
          <button
            onClick={handleCopy}
            style={{ position: "absolute", top: 12, right: 12, fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "0.5px solid rgba(0,0,0,0.15)", background: "#fff", cursor: "pointer" }}
          >
            {copied ? "已複製 ✓" : "複製"}
          </button>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "0.5px solid rgba(0,0,0,0.08)", textAlign: "center" }}>
            <a href="/login" style={{ fontSize: 13, color: "#1e40af", fontWeight: 500, textDecoration: "none" }}>
              想儲存並管理更多？免費註冊 →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

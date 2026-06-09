"use client";

import { useState } from "react";

type Tone = "formal" | "casual" | "concise";

const TONES: { value: Tone; label: string }[] = [
  { value: "formal", label: "正式" },
  { value: "casual", label: "活潑" },
  { value: "concise", label: "簡潔" },
];

export default function CoverLetterTab({ applicationId }: { applicationId: string }) {
  const [tone, setTone] = useState<Tone>("formal");
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, tone }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `錯誤 ${resp.status}`);
      }
      const data = await resp.json() as { coverLetter: string };
      setCoverLetter(data.coverLetter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失敗，請再試一次");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(coverLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("複製失敗");
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>AI 推薦信生成</p>
        <p style={{ fontSize: 12, color: "#999", marginTop: 2 }}>根據你的履歷和職缺描述，自動生成推薦信草稿</p>
      </div>

      {/* Tone selector */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.05em", marginBottom: 8 }}>語氣風格</p>
        <div style={{ display: "flex", gap: 8 }}>
          {TONES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTone(t.value)}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 500,
                border: tone === t.value ? "1.5px solid #111" : "1px solid rgba(0,0,0,0.1)",
                background: tone === t.value ? "#111" : "#fff",
                color: tone === t.value ? "#fff" : "#666",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={loading}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          background: loading ? "#ccc" : "#111",
          color: "#fff",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: 16,
        }}
      >
        {loading ? "生成中..." : coverLetter ? "重新生成" : "生成推薦信"}
      </button>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>
        </div>
      )}

      {coverLetter && (
        <div>
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            style={{
              width: "100%",
              minHeight: 240,
              border: "0.5px solid rgba(0,0,0,0.1)",
              borderRadius: 12,
              padding: 16,
              fontSize: 13,
              lineHeight: 1.8,
              resize: "vertical",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={copyToClipboard}
              style={{
                padding: "8px 20px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 500,
                background: copied ? "#22C55E" : "#fff",
                color: copied ? "#fff" : "#333",
                border: copied ? "1.5px solid #22C55E" : "1px solid rgba(0,0,0,0.1)",
                cursor: "pointer",
              }}
            >
              {copied ? "已複製 ✓" : "複製"}
            </button>
            <button
              onClick={generate}
              disabled={loading}
              style={{
                padding: "8px 20px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 500,
                background: "#fff",
                color: "#666",
                border: "1px solid rgba(0,0,0,0.1)",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              重新生成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

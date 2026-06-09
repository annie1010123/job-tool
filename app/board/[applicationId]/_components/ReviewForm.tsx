"use client";

import { useState } from "react";

interface QARow {
  question: string;
  answer: string;
  selfRating: "good" | "ok" | "needs_improvement";
}

const RATING_OPTIONS: { value: QARow["selfRating"]; label: string }[] = [
  { value: "good", label: "答得好" },
  { value: "ok", label: "普通" },
  { value: "needs_improvement", label: "需改進" },
];

export default function ReviewForm({
  applicationId,
  onComplete,
}: {
  applicationId: string;
  onComplete: (review: unknown) => void;
}) {
  const [rows, setRows] = useState<QARow[]>([
    { question: "", answer: "", selfRating: "ok" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateRow(index: number, field: keyof QARow, value: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { question: "", answer: "", selfRating: "ok" }]);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit() {
    const validRows = rows.filter((r) => r.question.trim());
    if (validRows.length === 0) {
      setError("請至少填寫一題");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`/api/applications/${applicationId}/review/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: validRows }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `錯誤 ${resp.status}`);
      }
      const data = await resp.json();
      onComplete(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送出失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>手動記錄面試</p>
      <p style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>填寫面試中被問到的問題和你的回答，AI 會幫你分析</p>

      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            background: "#FAFAFA",
            border: "0.5px solid rgba(0,0,0,0.1)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#666" }}>第 {i + 1} 題</span>
            {rows.length > 1 && (
              <button
                onClick={() => removeRow(i)}
                style={{ fontSize: 12, color: "#999", background: "none", border: "none", cursor: "pointer" }}
              >
                移除
              </button>
            )}
          </div>
          <input
            type="text"
            value={row.question}
            onChange={(e) => updateRow(i, "question", e.target.value)}
            placeholder="面試官問了什麼？"
            style={{
              width: "100%",
              border: "0.5px solid rgba(0,0,0,0.1)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              outline: "none",
              marginBottom: 8,
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
          <textarea
            value={row.answer}
            onChange={(e) => updateRow(i, "answer", e.target.value)}
            placeholder="你怎麼回答的？"
            rows={3}
            style={{
              width: "100%",
              border: "0.5px solid rgba(0,0,0,0.1)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              resize: "none",
              outline: "none",
              marginBottom: 8,
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
          <div>
            <span style={{ fontSize: 11, color: "#aaa", marginRight: 8 }}>自我評分</span>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {RATING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateRow(i, "selfRating", opt.value)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    border: row.selfRating === opt.value ? "1.5px solid #111" : "1px solid rgba(0,0,0,0.1)",
                    background: row.selfRating === opt.value ? "#111" : "#fff",
                    color: row.selfRating === opt.value ? "#fff" : "#666",
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addRow}
        style={{
          padding: "8px 16px",
          borderRadius: 20,
          fontSize: 13,
          background: "#fff",
          color: "#666",
          border: "1px solid rgba(0,0,0,0.1)",
          cursor: "pointer",
          marginBottom: 16,
        }}
      >
        + 新增一題
      </button>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>
        </div>
      )}

      <button
        onClick={submit}
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
        }}
      >
        {loading ? "AI 分析中..." : "送出分析"}
      </button>
    </div>
  );
}

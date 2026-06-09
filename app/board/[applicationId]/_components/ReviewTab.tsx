"use client";

import { useState, useRef } from "react";
import ReviewForm from "./ReviewForm";

interface ExtractedQA {
  question: string;
  answerSummary: string;
  quality: "good" | "ok" | "needs_improvement";
  improvementTip: string;
  category: string;
}

interface InterviewReview {
  id: string;
  audioUrl: string | null;
  transcript: string | null;
  extractedQA: ExtractedQA[] | null;
  overallFeedback: string | null;
  createdAt: string;
}

const QUALITY_BADGE: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  good: { emoji: "🟢", label: "表現好", color: "#166534", bg: "#F0FDF4" },
  ok: { emoji: "🟡", label: "普通", color: "#92400E", bg: "#FFFBEB" },
  needs_improvement: { emoji: "🔴", label: "需改善", color: "#991B1B", bg: "#FEF2F2" },
};

export default function ReviewTab({
  applicationId,
  reviews: initialReviews,
}: {
  applicationId: string;
  reviews: InterviewReview[];
}) {
  const [reviews, setReviews] = useState<InterviewReview[]>(initialReviews);
  const [mode, setMode] = useState<"list" | "upload" | "manual">("list");
  const [uploadStep, setUploadStep] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const latestReview = reviews.length > 0 ? reviews[0] : null;

  async function handleUpload(file: File) {
    setError("");
    try {
      // Step 1: Upload
      setUploadStep("上傳中...");
      const formData = new FormData();
      formData.append("audio", file);
      const uploadResp = await fetch(`/api/applications/${applicationId}/review/upload`, {
        method: "POST",
        body: formData,
      });
      if (!uploadResp.ok) throw new Error("上傳失敗");
      const { review } = await uploadResp.json() as { review: { id: string } };

      // Step 2: Transcribe
      setUploadStep("轉錄中...");
      const transcribeResp = await fetch(`/api/applications/${applicationId}/review/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id }),
      });
      if (!transcribeResp.ok) throw new Error("轉錄失敗");

      // Step 3: Analyze
      setUploadStep("分析中...");
      const analyzeResp = await fetch(`/api/applications/${applicationId}/review/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id }),
      });
      if (!analyzeResp.ok) throw new Error("分析失敗");
      const { analysis } = await analyzeResp.json() as { analysis: InterviewReview };

      setReviews((prev) => [analysis, ...prev]);
      setMode("list");
      setUploadStep("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "處理失敗");
      setUploadStep("");
    }
  }

  function handleManualComplete(data: unknown) {
    const d = data as { review?: InterviewReview };
    if (d.review) {
      setReviews((prev) => [d.review as InterviewReview, ...prev]);
    }
    setMode("list");
  }

  // Show manual form
  if (mode === "manual") {
    return (
      <div>
        <button
          onClick={() => setMode("list")}
          style={{ fontSize: 12, color: "#999", background: "none", border: "none", cursor: "pointer", marginBottom: 12 }}
        >
          ← 返回
        </button>
        <ReviewForm applicationId={applicationId} onComplete={handleManualComplete} />
      </div>
    );
  }

  // No reviews — show options
  if (!latestReview && mode === "list") {
    return (
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>面試復盤</p>
        <p style={{ fontSize: 12, color: "#999", marginBottom: 24 }}>上傳面試錄音或手動記錄，AI 幫你分析表現</p>

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>
          </div>
        )}

        {uploadStep ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>{uploadStep}</div>
            <div style={{ width: 120, height: 4, background: "#eee", borderRadius: 2, margin: "0 auto", overflow: "hidden" }}>
              <div style={{ width: "60%", height: "100%", background: "#111", borderRadius: 2, animation: "pulse 1.5s infinite" }} />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                flex: 1,
                padding: "24px 16px",
                borderRadius: 12,
                border: "1.5px dashed rgba(0,0,0,0.15)",
                background: "#FAFAFA",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>🎙️</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>上傳面試錄音</div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>支援 mp3, m4a, wav</div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
            <button
              onClick={() => setMode("manual")}
              style={{
                flex: 1,
                padding: "24px 16px",
                borderRadius: 12,
                border: "1.5px dashed rgba(0,0,0,0.15)",
                background: "#FAFAFA",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>✍️</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>手動記錄面試</div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>填寫問答讓 AI 分析</div>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Show latest review
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 2 }}>面試復盤</p>
          <p style={{ fontSize: 12, color: "#999" }}>
            {reviews.length} 筆紀錄 · 最近：{latestReview ? new Date(latestReview.createdAt).toLocaleDateString("zh-TW") : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => fileRef.current?.click()}
            style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, background: "#fff", color: "#666", border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer" }}
          >
            上傳錄音
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <button
            onClick={() => setMode("manual")}
            style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, background: "#fff", color: "#666", border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer" }}
          >
            手動記錄
          </button>
        </div>
      </div>

      {uploadStep && (
        <div style={{ textAlign: "center", padding: "20px 0", marginBottom: 16, background: "#FAFAFA", borderRadius: 12 }}>
          <div style={{ fontSize: 13, color: "#666" }}>{uploadStep}</div>
        </div>
      )}

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>
        </div>
      )}

      {latestReview && (
        <div>
          {/* Overall feedback */}
          {latestReview.overallFeedback && (
            <div style={{
              background: "linear-gradient(135deg, #F0F4FF 0%, #EEF2FF 100%)",
              borderLeft: "3px solid #6366F1",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 20,
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#4338CA", marginBottom: 8 }}>整體回饋</p>
              <p style={{ fontSize: 13, color: "#1e1e1e", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{latestReview.overallFeedback}</p>
            </div>
          )}

          {/* Audio player */}
          {latestReview.audioUrl && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.05em", marginBottom: 6 }}>面試錄音</p>
              <audio controls src={latestReview.audioUrl} style={{ width: "100%" }} />
            </div>
          )}

          {/* Q&A cards */}
          {latestReview.extractedQA && latestReview.extractedQA.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {latestReview.extractedQA.map((qa, i) => {
                const badge = QUALITY_BADGE[qa.quality] || QUALITY_BADGE.ok;
                return (
                  <div
                    key={i}
                    style={{
                      background: "#fff",
                      border: "0.5px solid rgba(0,0,0,0.1)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>Q{i + 1}.</span>
                      {qa.category && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#F5F5F5", color: "#666" }}>
                          {qa.category}
                        </span>
                      )}
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: badge.bg, color: badge.color, marginLeft: "auto" }}>
                        {badge.emoji} {badge.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", marginBottom: 6 }}>{qa.question}</p>
                    <p style={{ fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 8, background: "#FAFAFA", borderRadius: 8, padding: "8px 12px" }}>
                      {qa.answerSummary}
                    </p>
                    {qa.improvementTip && (
                      <div style={{ fontSize: 12, color: "#6366F1", background: "#F0F4FF", borderRadius: 8, padding: "8px 12px" }}>
                        💡 {qa.improvementTip}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

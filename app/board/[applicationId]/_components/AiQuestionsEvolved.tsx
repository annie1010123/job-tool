"use client";

import { useState } from "react";

interface AiQuestion {
  question: string;
  type: "行為題" | "技術題" | "動機題" | "情境題";
  prepared: boolean;
  fromHistory: boolean;
  relatedCompany: string | null;
  previousPerformance: string | null;
  improvementTip: string | null;
}

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  行為題: { bg: "#EFF6FF", color: "#2563EB" },
  技術題: { bg: "#F5F3FF", color: "#7C3AED" },
  動機題: { bg: "#F0FDF4", color: "#16A34A" },
  情境題: { bg: "#FFFBEB", color: "#D97706" },
};

const PERF_BADGE: Record<string, { label: string; color: string }> = {
  good: { label: "表現好", color: "#16A34A" },
  ok: { label: "普通", color: "#D97706" },
  needs_improvement: { label: "需改善", color: "#DC2626" },
};

export default function AiQuestionsEvolved({
  applicationId,
  initialQuestions,
}: {
  applicationId: string;
  initialQuestions: AiQuestion[];
}) {
  const [questions, setQuestions] = useState<AiQuestion[]>(initialQuestions);
  const [loading, setLoading] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [modelAnswers, setModelAnswers] = useState<Record<number, string>>({});
  const [loadingModel, setLoadingModel] = useState<number | null>(null);

  async function regenerate() {
    setLoading(true);
    try {
      const resp = await fetch(`/api/applications/${applicationId}/ai-questions`, { method: "POST" });
      if (!resp.ok) return;
      const data = await resp.json() as { questions: AiQuestion[] };
      setQuestions(data.questions ?? []);
      setModelAnswers({});
      setExpandedIdx(null);
    } finally {
      setLoading(false);
    }
  }

  async function getModelAnswer(index: number, question: string, type: string) {
    setLoadingModel(index);
    try {
      const resp = await fetch(`/api/applications/${applicationId}/ai-questions/model-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, type }),
      });
      if (!resp.ok) return;
      const data = await resp.json() as { modelAnswer: string };
      setModelAnswers((prev) => ({ ...prev, [index]: data.modelAnswer }));
    } finally {
      setLoadingModel(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 2 }}>AI 面試題目</p>
          <p style={{ fontSize: 12, color: "#999" }}>
            {questions.length > 0
              ? `${questions.length} 題 · 含 ${questions.filter((q) => q.fromHistory).length} 題歷史延伸`
              : "根據 JD + 你的面試經驗產生題目"}
          </p>
        </div>
        <button
          onClick={regenerate}
          disabled={loading}
          style={{
            padding: "6px 16px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 500,
            background: loading ? "#ccc" : "#111",
            color: "#fff",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "產生中..." : "重新生成"}
        </button>
      </div>

      {questions.length === 0 ? (
        <p style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "#999" }}>
          點「重新生成」讓 AI 根據職缺和面試經驗出題
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {questions.map((q, i) => {
            const typeStyle = TYPE_STYLE[q.type] || TYPE_STYLE["行為題"];
            const isExpanded = expandedIdx === i;
            const perf = q.previousPerformance ? PERF_BADGE[q.previousPerformance] : null;

            return (
              <div
                key={i}
                style={{
                  background: "#fff",
                  border: "0.5px solid rgba(0,0,0,0.1)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  style={{
                    padding: "14px 16px",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                >
                  {q.fromHistory && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                      <span style={{ fontSize: 12 }}>⚡</span>
                      <span style={{ fontSize: 11, color: "#6366F1", fontWeight: 500 }}>根據你的面試經驗延伸</span>
                      {q.relatedCompany && (
                        <span style={{ fontSize: 11, color: "#999" }}>· {q.relatedCompany}</span>
                      )}
                    </div>
                  )}
                  <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.5, margin: "0 0 8px" }}>{q.question}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: typeStyle.bg, color: typeStyle.color, fontWeight: 500 }}>
                      {q.type}
                    </span>
                    {perf && (
                      <span style={{ fontSize: 11, color: perf.color }}>
                        上次表現：{perf.label}
                      </span>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#ccc" }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {q.improvementTip && !isExpanded && (
                  <div style={{ padding: "0 16px 12px", fontSize: 12, color: "#6366F1" }}>
                    💡 {q.improvementTip}
                  </div>
                )}

                {isExpanded && (
                  <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.05)", padding: 16, background: "#FAFAFA" }}>
                    {q.improvementTip && (
                      <div style={{ background: "#F0F4FF", borderLeft: "3px solid #6366F1", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#4338CA", marginBottom: 4 }}>改善建議</p>
                        <p style={{ fontSize: 12, color: "#333", lineHeight: 1.6, margin: 0 }}>{q.improvementTip}</p>
                      </div>
                    )}

                    {modelAnswers[i] ? (
                      <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: "12px 14px" }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "#16A34A", marginBottom: 6 }}>建議回答</p>
                        <p style={{ fontSize: 12, color: "#333", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{modelAnswers[i]}</p>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); getModelAnswer(i, q.question, q.type); }}
                        disabled={loadingModel === i}
                        style={{
                          width: "100%",
                          padding: 10,
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 500,
                          background: "#fff",
                          border: "1.5px solid #22C55E",
                          color: "#22C55E",
                          cursor: loadingModel === i ? "not-allowed" : "pointer",
                        }}
                      >
                        {loadingModel === i ? "生成中..." : "生成建議回答"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {questions.length > 0 && (
        <p style={{ textAlign: "center", fontSize: 13, color: "#999", marginTop: 24 }}>
          完成這次面試的復盤，下次 AI 會更了解你 💪
        </p>
      )}
    </div>
  );
}

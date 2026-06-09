"use client";

import { useState } from "react";
import CoverLetterTab from "./CoverLetterTab";
import ReviewTab from "./ReviewTab";
import AiQuestionsEvolved from "./AiQuestionsEvolved";

type TabKey = "ai" | "cover-letter" | "review" | "info";

interface AiQuestion {
  question: string;
  type: "行為題" | "技術題" | "動機題" | "情境題";
  prepared: boolean;
  fromHistory: boolean;
  relatedCompany: string | null;
  previousPerformance: string | null;
  improvementTip: string | null;
}

interface InterviewReview {
  id: string;
  audioUrl: string | null;
  transcript: string | null;
  extractedQA: { question: string; answerSummary: string; quality: "good" | "ok" | "needs_improvement"; improvementTip: string; category: string }[] | null;
  overallFeedback: string | null;
  createdAt: string;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "ai", label: "面試準備" },
  { key: "cover-letter", label: "推薦信" },
  { key: "review", label: "面試復盤" },
  { key: "info", label: "基本資訊" },
];

export default function ApplicationTabs({
  applicationId,
  aiQuestions,
  reviews,
  children,
}: {
  applicationId: string;
  aiQuestions: AiQuestion[];
  reviews: InterviewReview[];
  children: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("ai");

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "0.5px solid rgba(0,0,0,0.1)", overflow: "hidden" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "0.5px solid rgba(0,0,0,0.06)", padding: "8px 8px 0" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #111" : "2px solid transparent",
              color: activeTab === tab.key ? "#111" : "#999",
              cursor: "pointer",
              marginBottom: -1,
              transition: "color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: 24 }}>
        {activeTab === "ai" && (
          <AiQuestionsEvolved applicationId={applicationId} initialQuestions={aiQuestions} />
        )}
        {activeTab === "cover-letter" && (
          <CoverLetterTab applicationId={applicationId} />
        )}
        {activeTab === "review" && (
          <ReviewTab applicationId={applicationId} reviews={reviews} />
        )}
        {activeTab === "info" && children}
      </div>
    </div>
  );
}

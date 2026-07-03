"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  { key: "info", label: "職缺資訊" },
  { key: "cover-letter", label: "投遞準備" },
  { key: "ai", label: "面試準備" },
  { key: "review", label: "面試復盤" },
];

export default function ApplicationTabs({
  applicationId,
  aiQuestions,
  reviews,
  children,
  defaultTab = "ai",
  jdDescription,
  resumeUrl,
  roleCategory,
}: {
  applicationId: string;
  aiQuestions: AiQuestion[];
  reviews: InterviewReview[];
  children: React.ReactNode;
  defaultTab?: TabKey;
  jdDescription?: string | null;
  resumeUrl?: string | null;
  roleCategory?: string | null;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabKey | null;
  const validTabs: TabKey[] = ["ai", "cover-letter", "review", "info"];
  const resolvedDefault: TabKey = (tabParam && validTabs.includes(tabParam)) ? tabParam : defaultTab;
  const [activeTab, setActiveTab] = useState<TabKey>(resolvedDefault);

  // 若 URL ?tab= 變動（例如從外部導航），同步更新
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  function goToReview() { setActiveTab("review"); }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-100 px-2 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "ai" && (
          <AiQuestionsEvolved applicationId={applicationId} initialQuestions={aiQuestions} jdDescription={jdDescription} roleCategory={roleCategory} onGoToReview={goToReview} />
        )}
        {activeTab === "cover-letter" && (
          <CoverLetterTab applicationId={applicationId} initialResumeUrl={resumeUrl ?? null} />
        )}
        {activeTab === "review" && (
          <ReviewTab applicationId={applicationId} reviews={reviews} />
        )}
        {activeTab === "info" && children}
      </div>
    </div>
  );
}

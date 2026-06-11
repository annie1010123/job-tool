"use client";

import { useState } from "react";

interface AiQuestion {
  question: string;
  type: "行為題" | "技術題" | "動機題" | "情境題";
  round: number;
  prepared: boolean;
  answerDraft: string;
  hidden: boolean;
  askedInInterview: boolean;
  fromHistory: boolean;
  relatedCompany: string | null;
  previousPerformance: string | null;
  improvementTip: string | null;
}

function normalize(q: Partial<AiQuestion>): AiQuestion {
  return {
    question: q.question ?? "",
    type: q.type ?? "行為題",
    round: q.round ?? 1,
    prepared: q.prepared ?? false,
    answerDraft: q.answerDraft ?? "",
    hidden: q.hidden ?? false,
    askedInInterview: q.askedInInterview ?? false,
    fromHistory: q.fromHistory ?? false,
    relatedCompany: q.relatedCompany ?? null,
    previousPerformance: q.previousPerformance ?? null,
    improvementTip: q.improvementTip ?? null,
  };
}

const TYPE_STYLE: Record<string, string> = {
  行為題: "bg-blue-50 text-blue-700",
  技術題: "bg-violet-50 text-violet-700",
  動機題: "bg-green-50 text-green-700",
  情境題: "bg-amber-50 text-amber-700",
};

const ANSWER_HINTS: Record<string, string> = {
  行為題: "用 STAR 結構（情境→任務→行動→結果）。聚焦你做了什麼，而非整個團隊。選一個有具體結果的例子。",
  技術題: "先說你的思路，再解釋具體做法。若不確定，誠實說明你會如何查找或請教。",
  動機題: "連結你的個人故事或價值觀，展示你對這家公司是真的有興趣，不只是廣投。",
  情境題: "直接進入情境，說明決策邏輯和框架。展示你怎麼思考，而非只說「我會先研究」。",
};

export default function AiQuestionsEvolved({
  applicationId,
  initialQuestions,
  jdDescription,
  onGoToReview,
}: {
  applicationId: string;
  initialQuestions: Partial<AiQuestion>[];
  jdDescription?: string | null;
  onGoToReview?: () => void;
}) {
  const [questions, setQuestions] = useState<AiQuestion[]>(initialQuestions.map(normalize));
  const [currentRound, setCurrentRound] = useState(1);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualType, setManualType] = useState<AiQuestion["type"]>("行為題");

  const rounds = [...new Set(questions.map(q => q.round))].sort();

  async function saveQuestions(updated: AiQuestion[]) {
    setQuestions(updated);
    await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiQuestions: updated }),
    });
  }

  async function updateQuestion(idx: number, patch: Partial<AiQuestion>) {
    const updated = questions.map((q, i) => i === idx ? { ...q, ...patch } : q);
    await saveQuestions(updated);
  }

  async function regenerate() {
    const prepared = questions.filter(q => q.prepared);
    if (prepared.length > 0 && !confirm("已有題目標記為「已準備」，重新生成會清空所有進度，確定？")) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/applications/${applicationId}/ai-questions`, { method: "POST" });
      if (!resp.ok) return;
      const data = await resp.json() as { questions: Partial<AiQuestion>[] };
      setQuestions((data.questions ?? []).map(normalize));
      setCurrentRound(1);
      setExpandedIdx(null);
    } finally {
      setLoading(false);
    }
  }

  async function appendQuestions() {
    setLoading(true);
    try {
      const resp = await fetch(`/api/applications/${applicationId}/ai-questions`, { method: "POST" });
      if (!resp.ok) return;
      const data = await resp.json() as { questions: Partial<AiQuestion>[] };
      const newQs = (data.questions ?? []).map(q => normalize({ ...q, round: currentRound }));
      await saveQuestions([...questions, ...newQs]);
    } finally {
      setLoading(false);
    }
  }

  function handleAddManual() {
    if (!manualText.trim()) return;
    const newQ = normalize({ question: manualText.trim(), type: manualType, round: currentRound });
    saveQuestions([...questions, newQ]);
    setManualText("");
    setShowManualInput(false);
  }

  const visibleForRound = questions.filter(q => q.round === currentRound && !q.hidden);
  const hiddenForRound  = questions.filter(q => q.round === currentRound && q.hidden);
  const preparedCount   = visibleForRound.filter(q => q.prepared).length;

  return (
    <div>
      {/* JD description fold */}
      {jdDescription && (
        <details className="mb-4 border border-zinc-100 rounded-xl overflow-hidden">
          <summary className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 cursor-pointer select-none text-sm font-medium text-zinc-600">
            <span>職缺描述</span>
            <span className="text-xs text-zinc-400">展開 / 收起</span>
          </summary>
          <div className="px-4 py-3 text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
            {jdDescription.length > 800 ? jdDescription.slice(0, 800) + "…" : jdDescription}
          </div>
        </details>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex bg-zinc-100 rounded-lg p-0.5">
          {rounds.map(r => (
            <button key={r} onClick={() => setCurrentRound(r)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${currentRound === r ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
              第 {r} 輪
            </button>
          ))}
          <button
            onClick={() => {
              const max = Math.max(...questions.map(q => q.round), 0);
              setCurrentRound(max + 1);
            }}
            className="text-xs font-medium px-3 py-1.5 text-zinc-400 hover:text-zinc-600">
            ＋ 輪次
          </button>
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowManualInput(v => !v)}
          className={`text-xs font-medium px-3 py-1.5 border rounded-lg transition-colors ${showManualInput ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-400"}`}>
          ＋ 手動加題
        </button>
        <button onClick={appendQuestions} disabled={loading}
          className="text-xs font-medium px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:border-zinc-400 transition-colors disabled:opacity-40">
          {loading ? "生成中…" : "補充題目"}
        </button>
      </div>

      {/* Manual add input */}
      {showManualInput && (
        <div className="mb-3 p-3 border border-zinc-200 rounded-xl bg-zinc-50 flex flex-col gap-2">
          <textarea
            autoFocus
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddManual(); } }}
            placeholder="輸入題目內容，按 Enter 新增"
            rows={2}
            className="text-sm border border-zinc-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-zinc-400 bg-white w-full"
          />
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(["行為題","技術題","動機題","情境題"] as AiQuestion["type"][]).map(t => (
                <button key={t} onClick={() => setManualType(t)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${manualType === t ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <button onClick={() => { setShowManualInput(false); setManualText(""); }} className="text-xs text-zinc-400 hover:text-zinc-600 px-2">取消</button>
            <button onClick={handleAddManual} disabled={!manualText.trim()}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-900 text-white disabled:opacity-40">
              新增
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {visibleForRound.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-900 rounded-full transition-all"
              style={{ width: `${(preparedCount / visibleForRound.length) * 100}%` }} />
          </div>
          <span className="text-xs text-zinc-400 whitespace-nowrap">{preparedCount} / {visibleForRound.length} 已準備</span>
        </div>
      )}

      {/* Empty state */}
      {visibleForRound.length === 0 && hiddenForRound.length === 0 && (
        <p className="text-center py-10 text-sm text-zinc-400">
          點「補充題目」讓 AI 根據職缺和面試經驗出題
        </p>
      )}

      {/* Question cards */}
      <div className="space-y-2">
        {visibleForRound.map((q) => {
          const globalIdx = questions.indexOf(q);
          const isExpanded = expandedIdx === globalIdx;

          return (
            <div key={globalIdx}
              className={`bg-white border rounded-xl overflow-hidden transition-all ${
                q.askedInInterview ? "border-green-200 bg-green-50/30" :
                q.fromHistory ? "border-violet-100" : "border-zinc-100"
              }`}>
              {/* Card header row */}
              <div className="flex items-start gap-3 px-4 py-3">
                {/* Checkbox */}
                <button
                  onClick={() => updateQuestion(globalIdx, { prepared: !q.prepared })}
                  className={`flex-shrink-0 mt-0.5 w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-colors ${
                    q.prepared ? "bg-zinc-900 border-zinc-900" :
                    q.askedInInterview ? "bg-green-500 border-green-500" :
                    "border-zinc-200"
                  }`}>
                  {(q.prepared || q.askedInInterview) && (
                    <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                {/* Question + tags */}
                <div className="flex-1 cursor-pointer" onClick={() => setExpandedIdx(isExpanded ? null : globalIdx)}>
                  <p className="text-sm text-zinc-700 leading-relaxed">{q.question}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_STYLE[q.type] ?? TYPE_STYLE["行為題"]}`}>
                      {q.type}
                    </span>
                    {q.askedInInterview && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                        ✓ 面試問到了
                      </span>
                    )}
                    {q.fromHistory && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">從歷史</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => updateQuestion(globalIdx, { askedInInterview: !q.askedInInterview })}
                    className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                      q.askedInInterview
                        ? "bg-green-50 border-green-200 text-green-700 font-medium"
                        : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
                    }`}>
                    {q.askedInInterview ? "✓ 問到了" : "面試有問到"}
                  </button>
                  <button
                    onClick={() => updateQuestion(globalIdx, { hidden: true })}
                    className="text-xs text-zinc-300 hover:text-zinc-500 px-1.5 py-1 transition-colors">
                    隱藏
                  </button>
                  <svg
                    onClick={() => setExpandedIdx(isExpanded ? null : globalIdx)}
                    className="cursor-pointer text-zinc-300"
                    width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                    style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .2s" }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-zinc-100 px-4 pb-4 pt-3 bg-zinc-50/50">
                  {/* askedInInterview → go to review */}
                  {q.askedInInterview && (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-3">
                      <span className="text-xs text-green-700 flex-1">這題面試有問到！去復盤記錄你的回答。</span>
                      <button onClick={onGoToReview}
                        className="text-xs font-semibold text-green-700 border border-green-300 rounded-md px-2.5 py-1 hover:bg-green-100">
                        去復盤 →
                      </button>
                    </div>
                  )}

                  {/* History improvement tip */}
                  {q.fromHistory && q.improvementTip && (
                    <div className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2.5 mb-3 text-xs text-violet-800 leading-relaxed">
                      <div className="font-semibold mb-1">📝 {q.relatedCompany ? `上次在 ${q.relatedCompany} 面試` : "歷史題目"}</div>
                      {q.previousPerformance && <div className="text-zinc-400 italic mb-1">「{q.previousPerformance}」</div>}
                      <div>改進方向：{q.improvementTip}</div>
                    </div>
                  )}

                  {/* Answer hint */}
                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 mb-3 text-xs text-amber-800 leading-relaxed">
                    <span className="font-semibold">💡 答題方向：</span>{ANSWER_HINTS[q.type]}
                  </div>

                  {/* Answer draft */}
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">我的答案</div>
                  <textarea
                    value={q.answerDraft}
                    onChange={e => updateQuestion(globalIdx, { answerDraft: e.target.value })}
                    placeholder="寫下你的答案思路..."
                    rows={4}
                    className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-zinc-400 bg-white leading-relaxed"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => updateQuestion(globalIdx, { prepared: !q.prepared })}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                        q.prepared ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                      }`}>
                      {q.prepared ? "✓ 已準備" : "標記已準備"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden questions */}
      {hiddenForRound.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-zinc-400 cursor-pointer select-none hover:text-zinc-600">
            已隱藏的題目（{hiddenForRound.length} 題）
          </summary>
          <div className="mt-2 space-y-1.5 opacity-50">
            {hiddenForRound.map(q => {
              const globalIdx = questions.indexOf(q);
              return (
                <div key={globalIdx} className="flex items-center gap-2 text-sm text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2">
                  <span className="flex-1">{q.question}</span>
                  <button
                    onClick={() => updateQuestion(globalIdx, { hidden: false })}
                    className="text-xs text-zinc-400 hover:text-zinc-700">復原</button>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* Regenerate warning row */}
      {questions.length > 0 && (
        <div className="flex items-center gap-2 mt-6 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
          <span className="flex-1">⚠ 重新生成會清空所有進度</span>
          <button onClick={regenerate} disabled={loading}
            className="font-medium px-3 py-1.5 border border-amber-200 rounded-lg bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-40 transition-colors">
            {loading ? "生成中…" : "重新生成"}
          </button>
        </div>
      )}
    </div>
  );
}

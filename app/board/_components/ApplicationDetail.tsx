"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, COMPANY_TYPES } from "./KanbanBoard";

interface AiReview {
  good: string;
  improve: string;
  suggested: string;
}

interface QA {
  question: string;
  answer: string;
  aiReview?: AiReview;
}

interface AiQuestion {
  question: string;
  type: "行為題" | "技術題" | "動機題" | "情境題";
  prepared: boolean;
  answer?: string;
  aiTip?: string;
  modelAnswer?: string;
}

const TYPE_COLOR: Record<string, string> = {
  行為題: "bg-blue-50 text-blue-600",
  技術題: "bg-violet-50 text-violet-600",
  動機題: "bg-green-50 text-green-600",
  情境題: "bg-amber-50 text-amber-600",
};

interface InterviewRecord {
  id: string;
  interviewedAt: string;
  interviewer: string | null;
  qa: QA[];
  notes: string | null;
}

interface Jd {
  id: string;
  title: string;
  companyName: string;
  salaryRange: string | null;
  location: string | null;
  externalUrl: string;
  description: string | null;
  skills: string[];
}

interface Application {
  id: string;
  status: string;
  companyType: string | null;
  appliedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  note: string | null;
  aiQuestions: AiQuestion[] | string[];
  jd: Jd;
  interviewRecords: InterviewRecord[];
}

function parseModelAnswer(raw: string) {
  const sections = raw.split(/\n(?=###\s)/).map((s) => s.trim()).filter(Boolean);
  let standardAnswer = "";
  let whyPoints: string[] = [];
  let swapPoints: string[] = [];
  for (const section of sections) {
    const lines = section.split("\n");
    const title = lines[0].replace(/^###\s*/, "").trim();
    const body = lines.slice(1).join("\n").trim();
    if (/示範回答|90.?分示範/.test(title)) {
      standardAnswer = body;
    } else if (/為什麼/.test(title)) {
      whyPoints = body.split(/\n/).map((l) => l.replace(/^[-•·*\d.]\s*/, "").trim()).filter(Boolean);
    } else if (/替換/.test(title)) {
      swapPoints = body.split(/\n/).map((l) => l.replace(/^[-•·*\d.]\s*/, "").trim()).filter(Boolean);
    }
  }
  return { standardAnswer, whyPoints, swapPoints };
}

function getDaysLabel(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  if (diff === 2) return "後天";
  if (diff < 0) return `${Math.abs(diff)} 天前`;
  return `${diff} 天後`;
}

function normaliseQuestions(raw: AiQuestion[] | string[]): AiQuestion[] {
  return (raw as (AiQuestion | string)[]).map((q) =>
    typeof q === "string"
      ? { question: q, type: "行為題" as const, prepared: false, answer: "", aiTip: "" }
      : { ...q, answer: q.answer ?? "", aiTip: q.aiTip ?? "", modelAnswer: q.modelAnswer ?? "" }
  );
}

function InlineField({
  value,
  placeholder,
  onSave,
  className = "",
  multiline = false,
}: {
  value: string;
  placeholder?: string;
  onSave: (v: string) => void;
  className?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  function commit() {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  }

  if (editing) {
    const sharedProps = {
      ref,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!multiline && e.key === "Enter") commit();
        if (e.key === "Escape") { setEditing(false); setDraft(value); }
      },
      autoFocus: true,
      className: `w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100 ${className}`,
    };
    return multiline
      ? <textarea {...sharedProps} rows={4} className={sharedProps.className + " resize-none"} />
      : <input {...sharedProps} />;
  }

  return (
    <span
      onClick={() => { setEditing(true); setDraft(value); }}
      className={`cursor-text hover:bg-zinc-50 rounded px-1 -mx-1 transition-colors ${className} ${!value ? "text-zinc-300 italic" : ""}`}
    >
      {value || placeholder || "（點擊編輯）"}
    </span>
  );
}

type TabKey = "info" | "ai" | "interviews";

export default function ApplicationDetail({ application, headerOnly = false }: { application: Application; headerOnly?: boolean }) {
  const [jd, setJd] = useState(application.jd);
  const [status, setStatus] = useState(application.status);
  const [companyType, setCompanyType] = useState<string | null>(application.companyType ?? null);
  const [appliedAt, setAppliedAt] = useState<string>(
    application.appliedAt
      ? new Date(application.appliedAt).toISOString().slice(0, 10)
      : new Date(application.createdAt).toISOString().slice(0, 10)
  );
  const [scheduledAt, setScheduledAt] = useState<string>(
    application.scheduledAt ? new Date(application.scheduledAt).toISOString().slice(0, 10) : ""
  );
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduledAtDraft, setScheduledAtDraft] = useState("");
  const [note, setNote] = useState(application.note ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [questions, setQuestions] = useState<AiQuestion[]>(normaliseQuestions(application.aiQuestions));
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [savingTip, setSavingTip] = useState<number | null>(null);
  const [savingModel, setSavingModel] = useState<number | null>(null);
  const [modelError, setModelError] = useState<string>("");
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [interviewRecords, setInterviewRecords] = useState(application.interviewRecords);
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const router = useRouter();

  const [intDate, setIntDate] = useState(new Date().toISOString().slice(0, 10));
  const [intInterviewer, setIntInterviewer] = useState("");
  const [intQA, setIntQA] = useState<QA[]>([{ question: "", answer: "" }]);
  const [intNotes, setIntNotes] = useState("");
  const [savingInterview, setSavingInterview] = useState(false);
  const [reviewingAI, setReviewingAI] = useState(false);

  async function patchApp(data: Record<string, unknown>) {
    await fetch(`/api/applications/${application.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
    });
  }

  async function patchJd(data: Record<string, string>) {
    setJd((prev) => ({ ...prev, ...data }));
    await patchApp({ jd: data });
  }

  async function updateStatus(newStatus: string) {
    setStatus(newStatus);
    await patchApp({ status: newStatus });
  }

  async function updateCompanyType(value: string | null) {
    setCompanyType(value);
    await patchApp({ companyType: value });
  }

  async function updateAppliedAt(date: string) {
    setAppliedAt(date);
    await patchApp({ appliedAt: date });
  }

  async function updateScheduledAt(date: string) {
    setScheduledAt(date);
    setEditingSchedule(false);
    await patchApp({ scheduledAt: date || null });
    router.refresh();
  }

  async function saveNote() {
    setSavingNote(true);
    await patchApp({ note });
    setSavingNote(false);
  }

  async function generateAI() {
    setGeneratingAI(true);
    const resp = await fetch(`/api/applications/${application.id}/ai-questions`, { method: "POST" });
    const data = await resp.json();
    setQuestions(normaliseQuestions(data.questions ?? []));
    setGeneratingAI(false);
  }

  async function togglePrepared(index: number) {
    const next = questions.map((q, i) => (i === index ? { ...q, prepared: !q.prepared } : q));
    setQuestions(next);
    await patchApp({ aiQuestions: next });
  }

  async function getModelAnswer(index: number, question: string, type: string) {
    setSavingModel(index);
    setModelError("");
    try {
      const resp = await fetch(`/api/applications/${application.id}/ai-questions/model-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, type }),
      });
      const data = await resp.json() as { modelAnswer?: string; error?: string };
      if (!resp.ok) {
        setModelError(`錯誤 ${resp.status}：${data.error ?? "未知錯誤"}`);
        return;
      }
      setQuestions((prev) => {
        const next = prev.map((q, i) => (i === index ? { ...q, modelAnswer: data.modelAnswer ?? "" } : q));
        patchApp({ aiQuestions: next });
        return next;
      });
    } catch (e) {
      console.error("model-answer fetch failed:", e);
      setModelError("網路錯誤，請再試一次");
    } finally {
      setSavingModel(null);
    }
  }

  async function saveAnswer(index: number, answer: string) {
    const next = questions.map((q, i) => (i === index ? { ...q, answer } : q));
    setQuestions(next);
    await patchApp({ aiQuestions: next });
    return next;
  }

  async function getAiTip(index: number, question: string, answer: string, type: string) {
    setSavingTip(index);
    try {
      const resp = await fetch(`/api/applications/${application.id}/ai-questions/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, type }),
      });
      if (!resp.ok) return;
      const data = await resp.json() as { tip: string };
      setQuestions((prev) => {
        const next = prev.map((q, i) => (i === index ? { ...q, answer, aiTip: data.tip } : q));
        patchApp({ aiQuestions: next });
        return next;
      });
    } finally {
      setSavingTip(null);
    }
  }

  const preparedCount = questions.filter((q) => q.prepared).length;

  async function submitInterview() {
    setSavingInterview(true);
    setReviewingAI(true);
    const resp = await fetch(`/api/applications/${application.id}/interviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interviewedAt: intDate,
        interviewer: intInterviewer || null,
        qa: intQA.filter((q) => q.question.trim()),
        notes: intNotes || null,
      }),
    });
    const data = await resp.json();
    setInterviewRecords((prev) => [data.record, ...prev]);
    setExpandedRecord(data.record.id);
    setShowInterviewForm(false);
    setIntQA([{ question: "", answer: "" }]);
    setIntNotes("");
    setIntInterviewer("");
    setSavingInterview(false);
    setReviewingAI(false);
  }

  const isManual = jd.externalUrl.startsWith("manual://");
  const currentCompanyType = COMPANY_TYPES.find((c) => c.value === companyType);

  const tabs: { key: TabKey; label: string; badge?: string }[] = [
    { key: "info", label: "職缺資訊" },
    {
      key: "ai",
      label: "AI 面試準備",
      badge: questions.length > 0 ? `${preparedCount}/${questions.length}` : undefined,
    },
    {
      key: "interviews",
      label: "面試紀錄",
      badge: interviewRecords.length > 0 ? String(interviewRecords.length) : undefined,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Always-visible header card */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="text-xl font-semibold text-zinc-900 flex-1">
            <InlineField
              value={jd.title}
              placeholder="職缺標題"
              onSave={(v) => patchJd({ title: v })}
            />
          </h1>
          {!isManual && (
            <a
              href={jd.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs bg-zinc-900 text-white rounded-lg px-3 py-1.5 hover:bg-zinc-700 transition-colors"
            >
              查看職缺 ↗
            </a>
          )}
        </div>
        <p className="text-zinc-500 mb-4">
          <InlineField
            value={jd.companyName}
            placeholder="公司名稱"
            onSave={(v) => patchJd({ companyName: v })}
          />
        </p>
        {/* Interactive status pills */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => updateStatus(s.value)}
              className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 transition-colors ${
                status === s.value
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100 border border-zinc-100"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {currentCompanyType && (
            <span className={`text-xs rounded-full px-2.5 py-1 ${currentCompanyType.badge}`}>
              {currentCompanyType.label}
            </span>
          )}
          <span className="text-xs text-zinc-400">投遞 {appliedAt}</span>
          {scheduledAt && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">
              面試 {new Date(scheduledAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })} · {getDaysLabel(scheduledAt)}
            </span>
          )}
        </div>
      </div>

      {/* Tabbed detail card */}
      {!headerOnly && (
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-zinc-100 px-2 pt-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span
                  className={`text-xs rounded-full px-1.5 py-0.5 leading-none ${
                    activeTab === tab.key
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── Tab: 職缺資訊 ── */}
          {activeTab === "info" && (
            <div className="space-y-5">
              <div className="space-y-4">
                {/* 職缺連結 */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-16 shrink-0">職缺連結</span>
                  <span className="text-sm text-zinc-600 flex-1 min-w-0 truncate">
                    <InlineField
                      value={isManual ? "" : jd.externalUrl}
                      placeholder="貼上職缺網址"
                      onSave={(v) => patchJd({ externalUrl: v || jd.externalUrl })}
                    />
                  </span>
                </div>
                {/* 公司類型 */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-16 shrink-0">公司類型</span>
                  <div className="flex gap-2">
                    {COMPANY_TYPES.map((ct) => (
                      <button
                        key={ct.value}
                        onClick={() => updateCompanyType(companyType === ct.value ? null : ct.value)}
                        className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                          companyType === ct.value
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 投遞狀態 */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-16 shrink-0">投遞狀態</span>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => updateStatus(s.value)}
                        className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1 border transition-colors ${
                          status === s.value
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 應徵日期 */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-16 shrink-0">應徵日期</span>
                  <input
                    type="date"
                    value={appliedAt}
                    onChange={(e) => updateAppliedAt(e.target.value)}
                    className="rounded-lg border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-zinc-400 text-zinc-700"
                  />
                </div>

                {/* 面試日期 */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-16 shrink-0">面試日期</span>
                  {scheduledAt && !editingSchedule ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={scheduledAt}
                        onChange={(e) => updateScheduledAt(e.target.value)}
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-zinc-400 text-zinc-700"
                      />
                      <span className="text-xs font-medium" style={{ color: "#A32D2D" }}>
                        {getDaysLabel(scheduledAt)}
                      </span>
                    </div>
                  ) : editingSchedule ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={scheduledAtDraft}
                        autoFocus
                        onChange={(e) => {
                          setScheduledAtDraft(e.target.value);
                          if (e.target.value) updateScheduledAt(e.target.value);
                        }}
                        onBlur={() => {
                          if (!scheduledAtDraft) setEditingSchedule(false);
                          setScheduledAtDraft("");
                        }}
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-zinc-400 text-zinc-700"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-300">暫無邀約</span>
                      <button
                        onClick={() => setEditingSchedule(true)}
                        className="text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-200 rounded px-2 py-0.5 transition-colors"
                      >
                        ＋ 新增
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* JD 內容 */}
              <div className="pt-4 border-t border-zinc-50">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">JD 內容</p>
                <InlineField
                  value={jd.description ?? ""}
                  placeholder="貼上職缺描述，AI 預測會更準確"
                  onSave={(v) => patchJd({ description: v })}
                  multiline
                  className="text-sm text-zinc-600 leading-relaxed w-full block"
                />
              </div>

              {/* 備註 */}
              <div className="pt-4 border-t border-zinc-50">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">備註</p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="記錄 offer 條件、聯絡人、截止日期…"
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm resize-none outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                />
                <button
                  onClick={saveNote}
                  disabled={savingNote}
                  className="mt-2 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  {savingNote ? "儲存中…" : "儲存備註"}
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: AI 面試準備 ── */}
          {activeTab === "ai" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">AI 面試題目</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {questions.length > 0
                      ? `${questions.length} 題 · 已準備 ${preparedCount} 題`
                      : "根據 JD 自動產生可能的面試問題"}
                  </p>
                </div>
                <button
                  onClick={generateAI}
                  disabled={generatingAI}
                  className="text-xs bg-zinc-900 text-white rounded-lg px-3 py-1.5 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {generatingAI ? "產生中…" : questions.length > 0 ? "重新產生" : "產生面試題"}
                </button>
              </div>

              {questions.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-400">準備進度</span>
                    <span className={`text-xs font-medium ${preparedCount === questions.length ? "text-green-600" : "text-zinc-500"}`}>
                      {preparedCount === questions.length ? "全部完成 ✓" : `${preparedCount} / ${questions.length} 題`}
                    </span>
                  </div>
                  <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${preparedCount === questions.length ? "bg-green-500" : "bg-zinc-700"}`}
                      style={{ width: `${questions.length > 0 ? (preparedCount / questions.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {questions.length > 0 ? (() => {
                const TYPE_ORDER: AiQuestion["type"][] = ["行為題", "情境題", "技術題", "動機題"];
                const grouped = TYPE_ORDER
                  .map((type) => ({
                    type,
                    items: questions.map((q, i) => ({ q, i })).filter(({ q }) => q.type === type),
                  }))
                  .filter(({ items }) => items.length > 0);

                return (
                  <div className="space-y-5">
                    {grouped.map(({ type, items }) => (
                      <div key={type}>
                        {/* Group header */}
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${TYPE_COLOR[type] ?? "bg-zinc-100 text-zinc-500"}`}>
                            {type}
                          </span>
                          <span className="text-xs text-zinc-300">{items.length} 題</span>
                          <span className="text-xs text-zinc-400 ml-auto">
                            已準備 {items.filter(({ q }) => q.prepared).length} / {items.length}
                          </span>
                        </div>

                        <ol className="space-y-2">
                          {items.map(({ q, i }, groupIdx) => {
                    const isExpanded = expandedQ === i;
                    return (
                      <li key={i} className="rounded-xl border border-zinc-100 overflow-hidden">
                        <div
                          className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors ${
                            q.prepared ? "bg-green-50 hover:bg-green-100" : "bg-zinc-50 hover:bg-zinc-100"
                          }`}
                          onClick={() => setExpandedQ(isExpanded ? null : i)}
                        >
                          <span className="shrink-0 w-5 h-5 rounded-full bg-white border border-zinc-200 text-zinc-400 text-xs flex items-center justify-center font-medium">
                            {groupIdx + 1}
                          </span>
                          <p className="flex-1 text-sm text-zinc-700 leading-snug min-w-0">{q.question}</p>
                          <span className="shrink-0 text-zinc-300 text-xs">{isExpanded ? "▲" : "▼"}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePrepared(i); }}
                            className={`shrink-0 text-xs rounded-lg px-3 py-1.5 font-medium transition-colors ${
                              q.prepared
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-white text-zinc-400 border border-zinc-200 hover:border-zinc-400 hover:text-zinc-600"
                            }`}
                          >
                            {q.prepared ? "✓ 已準備" : "已準備"}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-zinc-100 bg-white px-4 py-5" style={{ maxWidth: 680 }}>

                            {/* 優化我的回答 */}
                            <p style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.05em", margin: "0 0 8px" }}>優化我的回答</p>
                            <textarea
                              value={q.answer ?? ""}
                              onChange={(e) => setQuestions((prev) => prev.map((q2, j) => j === i ? { ...q2, answer: e.target.value } : q2))}
                              onBlur={async (e) => { const a = e.target.value.trim(); if (a) await saveAnswer(i, a); }}
                              placeholder="寫下思路，幾句話就可以..."
                              style={{ width: "100%", border: "0.5px solid #ddd", borderRadius: 8, padding: 12, fontSize: 13, resize: "none", height: 80, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                            />
                            <button
                              onClick={() => { const a = (q.answer ?? "").trim(); if (a) getAiTip(i, q.question, a, q.type); }}
                              disabled={savingTip === i || !(q.answer ?? "").trim()}
                              style={{ width: "100%", padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, marginTop: 8, background: (q.answer ?? "").trim() ? "#111" : "#ddd", border: "none", color: "#fff", cursor: (q.answer ?? "").trim() ? "pointer" : "not-allowed" }}
                            >
                              {savingTip === i ? "分析中…" : "優化我的回答"}
                            </button>

                            {q.aiTip && savingTip !== i && (
                              <div style={{ background: "#F0F4FF", borderLeft: "3px solid #6366F1", borderRadius: 8, padding: "14px 16px", marginTop: 12 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: "#3730A3", margin: "0 0 8px" }}>AI 優化建議</p>
                                <p style={{ fontSize: 13, color: "#1e1e1e", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{q.aiTip}</p>
                              </div>
                            )}

                            {/* Divider */}
                            <div style={{ borderTop: "0.5px solid #eee", margin: "20px 0" }} />

                            {/* 生成標準回答 */}
                            <p style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.05em", margin: "0 0 8px" }}>生成標準回答 · 不用輸入，直接看建議回答的示範</p>
                            <button
                              onClick={() => getModelAnswer(i, q.question, q.type)}
                              disabled={savingModel === i}
                              style={{ width: "100%", padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: savingModel === i ? "not-allowed" : "pointer", background: "#fff", border: "1.5px solid #22C55E", color: "#22C55E" }}
                            >
                              {savingModel === i ? "生成中…" : "生成建議回答"}
                            </button>
                            {modelError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>{modelError}</p>}

                            {q.modelAnswer && savingModel !== i && (() => {
                              const { standardAnswer, whyPoints, swapPoints } = parseModelAnswer(q.modelAnswer);
                              return (
                                <div style={{ marginTop: 16 }}>
                                  <div style={{ background: "#F8F8F8", borderRadius: 12, padding: "16px 20px", marginBottom: 12 }}>
                                    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "#F0FDF4", color: "#166534", marginBottom: 10 }}>建議回答</span>
                                    <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{standardAnswer || q.modelAnswer}</p>
                                  </div>
                                  {whyPoints.length > 0 && (
                                    <div style={{ background: "#FFFBEB", borderLeft: "3px solid #F59E0B", borderRadius: 12, padding: "16px 20px", marginBottom: 12 }}>
                                      <p style={{ fontSize: 13, fontWeight: 600, color: "#92400E", margin: "0 0 10px" }}>為什麼這樣回答有 90 分</p>
                                      {whyPoints.map((pt, pi) => (
                                        <div key={pi} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                                          <span style={{ color: "#F59E0B", fontWeight: 700 }}>·</span>
                                          <span style={{ fontSize: 12, color: "#666", lineHeight: 1.7 }}>{pt}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {swapPoints.length > 0 && (
                                    <div style={{ background: "#EFF6FF", borderLeft: "3px solid #3B82F6", borderRadius: 12, padding: "16px 20px" }}>
                                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1E40AF", margin: "0 0 10px" }}>替換成你自己的經驗</p>
                                      {swapPoints.map((pt, pi) => (
                                        <div key={pi} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                                          <span style={{ color: "#3B82F6", fontWeight: 700 }}>·</span>
                                          <span style={{ fontSize: 12, color: "#666", lineHeight: 1.7 }}>{pt}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                          </li>
                        );
                      })}
                        </ol>
                      </div>
                    ))}
                  </div>
                );
              })() : (
                <p className="text-sm text-zinc-400 text-center py-8">
                  {companyType
                    ? `已選擇「${COMPANY_TYPES.find((c) => c.value === companyType)?.label}」，點「產生面試題」開始`
                    : "點「產生面試題」，AI 會根據職缺描述整理題目"}
                </p>
              )}
            </div>
          )}

          {/* ── Tab: 面試紀錄 ── */}
          {activeTab === "interviews" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">面試紀錄</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{interviewRecords.length} 筆紀錄</p>
                </div>
                <button
                  onClick={() => setShowInterviewForm((v) => !v)}
                  className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg px-3 py-1.5 transition-colors"
                >
                  {showInterviewForm ? "取消" : "+ 新增紀錄"}
                </button>
              </div>

              {showInterviewForm && (
                <div className="mb-6 p-4 bg-zinc-50 rounded-xl border border-zinc-100 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">面試日期</label>
                      <input
                        type="date"
                        value={intDate}
                        onChange={(e) => setIntDate(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">面試官（選填）</label>
                      <input
                        type="text"
                        value={intInterviewer}
                        onChange={(e) => setIntInterviewer(e.target.value)}
                        placeholder="e.g. HR、主管"
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-500 mb-2 block">問答紀錄</label>
                    {intQA.map((qa, i) => (
                      <div key={i} className="mb-3 space-y-1.5">
                        <input
                          type="text"
                          value={qa.question}
                          onChange={(e) => {
                            const next = [...intQA];
                            next[i] = { ...next[i], question: e.target.value };
                            setIntQA(next);
                          }}
                          placeholder={`問題 ${i + 1}`}
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                        />
                        <textarea
                          value={qa.answer}
                          onChange={(e) => {
                            const next = [...intQA];
                            next[i] = { ...next[i], answer: e.target.value };
                            setIntQA(next);
                          }}
                          placeholder="你的回答"
                          rows={2}
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm resize-none outline-none focus:border-zinc-400"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => setIntQA([...intQA, { question: "", answer: "" }])}
                      className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      + 新增一題
                    </button>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">其他備註</label>
                    <textarea
                      value={intNotes}
                      onChange={(e) => setIntNotes(e.target.value)}
                      placeholder="面試氣氛、特殊狀況…"
                      rows={2}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm resize-none outline-none focus:border-zinc-400"
                    />
                  </div>

                  <button
                    onClick={submitInterview}
                    disabled={savingInterview}
                    className="w-full bg-zinc-900 text-white text-sm rounded-lg py-2.5 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  >
                    {reviewingAI ? "AI 分析中…" : savingInterview ? "儲存中…" : "儲存面試紀錄"}
                  </button>
                </div>
              )}

              {interviewRecords.length === 0 && !showInterviewForm ? (
                <p className="text-sm text-zinc-400 text-center py-8">還沒有面試紀錄</p>
              ) : (
                <div className="space-y-3">
                  {interviewRecords.map((rec) => (
                    <div key={rec.id} className="rounded-xl border border-zinc-100 overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors text-left"
                        onClick={() => setExpandedRecord(expandedRecord === rec.id ? null : rec.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="text-sm font-medium text-zinc-700">
                            {new Date(rec.interviewedAt).toLocaleDateString("zh-TW")}
                          </span>
                          {rec.interviewer && (
                            <span className="text-xs text-zinc-400">面試官：{rec.interviewer}</span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-400">
                          {expandedRecord === rec.id ? "收起" : `${rec.qa.length} 題 →`}
                        </span>
                      </button>

                      {expandedRecord === rec.id && (
                        <div className="px-4 pb-4 space-y-5 border-t border-zinc-50 pt-4">
                          {rec.qa.map((qa, i) => (
                            <div key={i}>
                              <p className="text-sm font-medium text-zinc-800 mb-2">Q{i + 1}. {qa.question}</p>
                              <p className="text-sm text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2 whitespace-pre-wrap mb-3">
                                {qa.answer || "（未記錄）"}
                              </p>
                              {qa.aiReview && (
                                <div className="rounded-xl border border-zinc-100 overflow-hidden text-sm">
                                  <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-100">
                                    <span className="text-xs font-medium text-zinc-500">AI 回饋</span>
                                  </div>
                                  <div className="divide-y divide-zinc-50">
                                    <div className="px-3 py-2.5">
                                      <p className="text-xs font-medium text-green-600 mb-1">① 回答得好的地方</p>
                                      <p className="text-zinc-600 leading-relaxed">{qa.aiReview.good}</p>
                                    </div>
                                    <div className="px-3 py-2.5">
                                      <p className="text-xs font-medium text-amber-600 mb-1">② 可以更具體的地方</p>
                                      <p className="text-zinc-600 leading-relaxed">{qa.aiReview.improve}</p>
                                    </div>
                                    <div className="px-3 py-2.5 bg-blue-50/50">
                                      <p className="text-xs font-medium text-blue-600 mb-1">③ 建議優化版本</p>
                                      <p className="text-zinc-700 leading-relaxed">{qa.aiReview.suggested}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {rec.notes && (
                            <div className="pt-2 border-t border-zinc-100">
                              <p className="text-xs text-zinc-400 mb-1">備註</p>
                              <p className="text-sm text-zinc-600">{rec.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

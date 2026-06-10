"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

// 詳細頁狀態下拉用（5 個選項）
export const STATUSES = [
  { value: "not_applied",  label: "未投遞",         dot: "bg-zinc-400" },
  { value: "applied",      label: "投遞中",         dot: "bg-blue-500" },
  { value: "interviewing", label: "面試中",         dot: "bg-amber-500" },
  { value: "offer",        label: "錄取 🎉",        dot: "bg-green-500" },
  { value: "rejected",     label: "感謝信（被刷）",  dot: "bg-red-400" },
] as const;

export type AppStatus = (typeof STATUSES)[number]["value"];

// 看板 4 欄（結果欄含 offer + rejected）
export const KANBAN_COLUMNS = [
  { value: "not_applied",  label: "未投遞", dot: "bg-zinc-400", colBg: "bg-zinc-50",      statuses: ["not_applied"] as string[] },
  { value: "applied",      label: "投遞中", dot: "bg-blue-500", colBg: "bg-blue-50/40",   statuses: ["applied"] as string[] },
  { value: "interviewing", label: "面試中", dot: "bg-amber-500",colBg: "bg-amber-50/40",  statuses: ["interviewing"] as string[] },
  { value: "result",       label: "結果",   dot: "bg-green-500",colBg: "bg-green-50/40",  statuses: ["offer", "rejected"] as string[] },
] as const;

export const COMPANY_TYPES = [
  { value: "startup", label: "新創", badge: "bg-orange-100 text-orange-600" },
  { value: "large", label: "大公司", badge: "bg-blue-100 text-blue-600" },
  { value: "traditional", label: "傳產", badge: "bg-zinc-100 text-zinc-500" },
] as const;

interface Jd {
  id: string;
  title: string;
  companyName: string;
  externalUrl: string;
  postedAt: string | null;
}

interface App {
  id: string;
  status: string;
  companyType: string | null;
  createdAt: string;
  scheduledAt: string | null;
  jd: Jd;
  interviewRecords: unknown[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getDaysLabel(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  if (diff === 2) return "後天";
  if (diff < 0) return `${Math.abs(diff)} 天前`;
  return `${diff} 天後`;
}

// ─── Add Job Modal ────────────────────────────────────────────────────────────

function AddJobModal({ onClose, onAdded }: { onClose: () => void; onAdded: (app: App) => void }) {
  const [parseUrl, setParseUrl] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parsed, setParsed] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [jdContent, setJdContent] = useState("");
  const [companyType, setCompanyType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function parseFromUrl() {
    const url = parseUrl.trim();
    if (!url) return;
    setParsing(true);
    setParseError("");
    const resp = await fetch("/api/parse-jd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await resp.json();
    setParsing(false);
    if (!resp.ok || data.error) {
      setParseError("無法解析此網頁，請手動填寫（部分網站需要登入）");
      return;
    }
    const { companyName: c, jobTitle: j, jdContent: d } = data.parsed;
    if (c) setCompanyName(c);
    if (j) setJobTitle(j);
    if (d) setJdContent(d);
    setSourceUrl(url);
    setParsed(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !jobTitle.trim()) {
      setError("公司名稱和職缺名稱為必填");
      return;
    }
    setSaving(true);
    setError("");
    const resp = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, jobTitle, sourceUrl: sourceUrl || undefined, jdContent: jdContent || undefined, companyType: companyType || undefined }),
    });
    if (!resp.ok) {
      setError("新增失敗，請再試一次");
      setSaving(false);
      return;
    }
    const data = await resp.json();
    onAdded({ ...data.application, interviewRecords: [] });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-5">新增職缺</h2>

        {/* URL parse section */}
        <div className="mb-5 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
          <label className="text-xs text-zinc-500 mb-2 block">貼上職缺網址自動解析（選填）</label>
          <div className="flex gap-2">
            <input
              value={parseUrl}
              onChange={(e) => { setParseUrl(e.target.value); setParsed(false); setParseError(""); }}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), parseFromUrl())}
              placeholder="https://www.104.com.tw/job/..."
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 min-w-0"
            />
            <button
              type="button"
              onClick={parseFromUrl}
              disabled={parsing || !parseUrl.trim()}
              className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white hover:bg-zinc-700 transition-colors disabled:opacity-40"
            >
              {parsing ? "解析中…" : "解析"}
            </button>
          </div>
          {parseError && <p className="text-xs text-amber-600 mt-1.5">{parseError}</p>}
          {parsed && <p className="text-xs text-green-600 mt-1.5">解析成功，請確認下方資料後新增</p>}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">公司名稱 *</label>
            <input
              autoFocus={!parseUrl}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Google"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">職缺名稱 *</label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. 產品經理實習生"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">職缺描述／JD（選填）</label>
            <textarea
              value={jdContent}
              onChange={(e) => setJdContent(e.target.value)}
              placeholder="貼上 JD 或摘要，之後可用於 AI 面試題預測…"
              rows={3}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm resize-none outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-2 block">公司類型（選填，影響 AI 面試題風格）</label>
            <div className="flex gap-2">
              {COMPANY_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setCompanyType(companyType === ct.value ? null : ct.value)}
                  className={`flex-1 rounded-lg border py-2 text-xs transition-colors ${
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

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-zinc-900 py-2.5 text-sm text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {saving ? "新增中…" : "新增職缺"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────

export default function KanbanBoard({ initialApplications }: { initialApplications: App[] }) {
  const router = useRouter();
  const [apps, setApps] = useState<App[]>(initialApplications);
  const [showAddModal, setShowAddModal] = useState(false);
  const dragId = useRef<string | null>(null);

  // Sync with server data after soft navigation (e.g. returning from detail page)
  useEffect(() => {
    setApps(initialApplications);
  }, [initialApplications]);

  async function moveStatus(appId: string, newStatus: AppStatus) {
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)));
    await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function deleteApp(appId: string) {
    setApps((prev) => prev.filter((a) => a.id !== appId));
    await fetch(`/api/applications/${appId}`, { method: "DELETE" });
  }

  function onDragStart(appId: string) {
    dragId.current = appId;
  }

  function onDropColumn(status: AppStatus) {
    if (!dragId.current) return;
    const app = apps.find((a) => a.id === dragId.current);
    if (app && app.status !== status) moveStatus(dragId.current, status);
    dragId.current = null;
  }

  const columns = KANBAN_COLUMNS.map((s) => ({
    ...s,
    cards: apps.filter((a) => s.statuses.includes(a.status)),
  }));

  return (
    <>
      {showAddModal && (
        <AddJobModal
          onClose={() => setShowAddModal(false)}
          onAdded={(app) => {
            setApps((prev) => [app, ...prev]);
            setShowAddModal(false);
          }}
        />
      )}

      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="text-sm bg-zinc-900 text-white rounded-lg px-4 py-2 hover:bg-zinc-700 transition-colors"
        >
          + 新增職缺
        </button>
      </div>

      {apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-200 mx-auto">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="12" y2="16" />
            </svg>
          </div>
          <p className="text-zinc-400 text-sm mb-4">還沒有追蹤的職缺</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-sm bg-zinc-900 text-white rounded-lg px-4 py-2 hover:bg-zinc-700 transition-colors"
          >
            + 新增第一筆職缺
          </button>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div
              key={col.value}
              className="flex-shrink-0 w-64"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropColumn(col.statuses[0] as AppStatus)}
            >
              {/* Column header */}
              <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl ${col.colBg}`}>
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <span className="text-sm font-semibold text-zinc-700">{col.label}</span>
                <span className="ml-auto text-xs font-medium text-zinc-500 bg-white rounded-full px-2 py-0.5 border border-zinc-100 min-w-[20px] text-center">
                  {col.cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-16">
                {col.cards.map((app) => (
                  <div
                    key={app.id}
                    draggable
                    onDragStart={() => onDragStart(app.id)}
                    className="bg-white rounded-xl border border-zinc-100 p-4 shadow-sm hover:shadow-md hover:border-zinc-200 transition-all cursor-grab active:cursor-grabbing"
                  >
                    {/* Card body — click to detail */}
                    <div className="cursor-pointer" onClick={() => router.push(`/board/${app.id}`)}>
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <p className="text-sm font-medium text-zinc-900 leading-snug line-clamp-2">
                          {app.jd.title}
                        </p>
                        {app.companyType && (() => {
                          const ct = COMPANY_TYPES.find((c) => c.value === app.companyType);
                          return ct ? (
                            <span className={`shrink-0 text-xs rounded-full px-2 py-0.5 ${ct.badge}`}>
                              {ct.label}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <p className="text-xs text-zinc-500 mb-3">{app.jd.companyName}</p>
                      {app.scheduledAt ? (
                        <p className="text-xs font-medium" style={{ color: "#A32D2D" }}>
                          面試：{formatDate(app.scheduledAt)}（{getDaysLabel(app.scheduledAt)}）
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-300">暫無面試邀約</p>
                      )}
                    </div>

                    {/* Delete button — only visible on hover */}
                    <div className="mt-3 pt-2 border-t border-zinc-50 flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          if (confirm(`確定刪除「${app.jd.title}」？`)) deleteApp(app.id);
                        }}
                        className="text-xs text-zinc-300 hover:text-red-400 transition-colors"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                ))}

                {col.cards.length === 0 && (
                  <div className="rounded-xl border border-dashed border-zinc-100 h-16" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

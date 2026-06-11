"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AddJobModal from "./AddJobModal";
import IntentEditModal from "./IntentEditModal";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Jd {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  salaryRange: string | null;
  recruitmentActivity: string | null;
  replyDays: string | null;
  postedAt: string | null;
  externalUrl: string;
  crawledAt: string;
}

interface Rec {
  id: string;
  finalScore: number;
  alignedSkills: unknown;
  jd: Jd;
}

interface WatchingApp {
  id: string;
  companyType: string | null;
  createdAt: string;
  status: string;
  jd: {
    id: string;
    title: string;
    companyName: string;
    source: string;
    externalUrl: string;
  };
}

interface Props {
  recommendations: Rec[];
  watchingApps: WatchingApp[];
  intentRaw: string;
  keywords: string[];
  locationFilter: string[];
  batchDateStr: string | null;
  isToday: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SOURCE_FILTERS = [
  { value: "全部", label: "全部來源" },
  { value: "104", label: "104" },
  { value: "cake", label: "Cake" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "yourator", label: "Yourator" },
  { value: "manual", label: "手動新增" },
];

const PLATFORM_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  "104": { bg: "#FFF3E6", color: "#E67E22", label: "104" },
  linkedin: { bg: "#E8F4F8", color: "#0A66C2", label: "LinkedIn" },
  cake: { bg: "#FFF3E6", color: "#E67E22", label: "Cake" },
  yourator: { bg: "#E8F8E8", color: "#2E7D32", label: "Yourator" },
  manual: { bg: "#f7f6f3", color: "#888780", label: "手動新增" },
  other: { bg: "#f7f6f3", color: "#888780", label: "其他" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseSalaryMin(s: string | null): number {
  if (!s) return 0;
  const text = s.replace(/,/g, "");
  const yearly = text.match(/年薪\s*(\d+)/);
  if (yearly) return Math.round(parseInt(yearly[1]) / 12);
  const monthly = text.match(/月薪\s*(\d+)/);
  if (monthly) return parseInt(monthly[1]);
  return 0;
}

function formatCrawledDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatSavedDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "12px 20px",
  fontSize: 14,
  fontWeight: active ? 600 : 500,
  color: active ? "#1a1a18" : "#888780",
  cursor: "pointer",
  borderBottom: active ? "2px solid #1a1a18" : "2px solid transparent",
  transition: "all 0.15s",
  background: "none",
  border: "none",
  borderBottomWidth: 2,
  borderBottomStyle: "solid",
  borderBottomColor: active ? "#1a1a18" : "transparent",
});

const countBadge = (active: boolean): React.CSSProperties => ({
  fontSize: 11,
  background: active ? "#1a1a18" : "#e8e4db",
  color: active ? "#fff" : "#666",
  padding: "1px 7px",
  borderRadius: 10,
  marginLeft: 6,
});

const pillBase: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 20,
  border: "0.5px solid rgba(0,0,0,0.12)", cursor: "pointer",
  background: "#fff", color: "#1a1a18", transition: "all 0.15s",
};

const pillActive: React.CSSProperties = {
  ...pillBase, background: "#1a1a18", color: "#fff", borderColor: "#1a1a18",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function FindJobTabs({
  recommendations,
  watchingApps,
  intentRaw,
  keywords,
  locationFilter,
  batchDateStr,
  isToday: _isToday,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"recs" | "saved">("recs");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIntentModal, setShowIntentModal] = useState(false);

  // Rec tab state
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [sort, setSort] = useState("score");
  const [savedRecIds, setSavedRecIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  // Saved tab state
  const [sourceFilter, setSourceFilter] = useState("全部");
  const [apps, setApps] = useState(watchingApps);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // ─── Rec filtering ──────────────────────────────────────────────────────

  const filteredRecs = useMemo(() => {
    let list = [...recommendations];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.jd.title.toLowerCase().includes(q) ||
          r.jd.companyName.toLowerCase().includes(q)
      );
    }
    if (scoreFilter === "high") list = list.filter((r) => r.finalScore >= 0.8);
    if (scoreFilter === "mid") list = list.filter((r) => r.finalScore >= 0.6 && r.finalScore < 0.8);

    if (sort === "score") list.sort((a, b) => b.finalScore - a.finalScore);
    if (sort === "salary") list.sort((a, b) => parseSalaryMin(b.jd.salaryRange) - parseSalaryMin(a.jd.salaryRange));
    if (sort === "crawled") list.sort((a, b) => new Date(b.jd.crawledAt).getTime() - new Date(a.jd.crawledAt).getTime());
    return list;
  }, [recommendations, search, scoreFilter, sort]);

  // ─── Saved filtering ───────────────────────────────────────────────────

  const filteredApps = apps.filter(
    (a) => sourceFilter === "全部" || a.jd.source === sourceFilter
  );

  // ─── Actions ────────────────────────────────────────────────────────────

  async function handleSaveRec(jdId: string) {
    if (savedRecIds.has(jdId) || savingId) return;
    setSavingId(jdId);
    const resp = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jdId, status: "watching" }),
    });
    if (resp.ok) {
      setSavedRecIds((prev) => new Set([...prev, jdId]));
      router.refresh();
    }
    setSavingId(null);
  }

  async function handleApply(appId: string) {
    setApplyingId(appId);
    const resp = await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "applied", appliedAt: new Date().toISOString() }),
    });
    if (resp.ok) {
      setApps((prev) => prev.filter((a) => a.id !== appId));
      router.refresh();
    }
    setApplyingId(null);
  }

  async function handleDelete(appId: string) {
    const resp = await fetch(`/api/applications/${appId}`, { method: "DELETE" });
    if (resp.ok) {
      setApps((prev) => prev.filter((a) => a.id !== appId));
      router.refresh();
    }
  }

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #e0dbd0", marginBottom: 20 }}>
        <button style={tabStyle(activeTab === "recs")} onClick={() => setActiveTab("recs")}>
          AI 推薦<span style={countBadge(activeTab === "recs")}>{recommendations.length}</span>
        </button>
        <button style={tabStyle(activeTab === "saved")} onClick={() => setActiveTab("saved")}>
          我的收藏<span style={countBadge(activeTab === "saved")}>{apps.length}</span>
        </button>
        <div style={{ marginLeft: "auto", paddingBottom: 8 }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 20, border: "none", background: "#1a1a18", color: "#fff", cursor: "pointer" }}
          >
            ＋ 新增職缺
          </button>
        </div>
      </div>

      {/* ─── AI 推薦 Tab ─────────────────────────────────────────────────── */}
      {activeTab === "recs" && (
        <div>
          {/* Intent bar */}
          <div style={{
            background: "#fff", borderRadius: 14, padding: "14px 20px",
            border: "1px solid #e8e4db", marginBottom: 16,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, color: "#888780" }}>⚙</span>
              <span style={{ fontSize: 12, color: "#888780" }}>求職意圖：</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a18" }}>{intentRaw}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {keywords.slice(0, 5).map((kw) => (
                  <span key={kw} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "#f0ebe1", color: "#666" }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowIntentModal(true)}
              style={{ fontSize: 12, color: "#888780", background: "none", border: "none", cursor: "pointer" }}
            >
              編輯 →
            </button>
          </div>

          {/* Update info */}
          <div style={{ fontSize: 12, color: "#888780", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1a1a18" }} />
            {batchDateStr ? `${batchDateStr} 更新 · 保留近三天` : "尚未配對"}
          </div>

          {/* Filter bar */}
          <div style={{
            background: "#fff", borderRadius: 14, border: "1px solid #e8e4db",
            padding: "16px 18px", marginBottom: 16,
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜尋職位、公司..."
                style={{
                  flex: 1, minWidth: 180, padding: "8px 14px", borderRadius: 8,
                  border: "1px solid #e0dbd0", fontSize: 13, outline: "none", background: "#fafaf8",
                }}
              />
              <select
                value={scoreFilter}
                onChange={(e) => setScoreFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e0dbd0", fontSize: 13, background: "#fff", cursor: "pointer", outline: "none" }}
              >
                <option value="all">全部相符度</option>
                <option value="high">≥ 80%</option>
                <option value="mid">60-79%</option>
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e0dbd0", fontSize: 13, background: "#fff", cursor: "pointer", outline: "none" }}
              >
                <option value="score">依相符分數</option>
                <option value="salary">依薪資</option>
                <option value="crawled">依爬蟲日期</option>
              </select>
            </div>
            <div style={{ fontSize: 12, color: "#888780", marginTop: 10 }}>
              顯示 {filteredRecs.length} / {recommendations.length} 筆
            </div>
          </div>

          {/* Rec list */}
          {filteredRecs.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#888780" }}>
                {recommendations.length === 0
                  ? "職缺配對中⋯ 明天早上 8:00 會寄到你的信箱 📬"
                  : "沒有符合篩選條件的職缺"}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredRecs.map((rec) => {
                const score = Math.round(rec.finalScore * 100);
                const skills = (rec.alignedSkills as string[]) ?? [];
                const salaryMin = parseSalaryMin(rec.jd.salaryRange);
                const salaryLabel = salaryMin > 0 ? `${salaryMin.toLocaleString()}+` : "面議";
                const active = rec.jd.recruitmentActivity?.includes("活躍") ?? false;
                const isSaved = savedRecIds.has(rec.jd.id);

                return (
                  <div
                    key={rec.id}
                    style={{
                      background: "#fff", borderRadius: 14, border: "1px solid #e8e4db",
                      borderLeft: `3px solid ${active ? "#1a1a18" : "#e8e4db"}`,
                      padding: "16px 20px", cursor: "pointer",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onClick={() => window.open(rec.jd.externalUrl, "_blank")}
                  >
                    {/* Top row */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a18", marginBottom: 3 }}>
                          {rec.jd.title}
                        </div>
                        <div style={{ fontSize: 13, color: "#666" }}>
                          {rec.jd.companyName}{rec.jd.location ? ` · ${rec.jd.location}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, padding: "4px 12px", borderRadius: 8, background: "#f0ebe1", color: "#1a1a18" }}>
                          {score}%
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSaveRec(rec.jd.id); }}
                          disabled={isSaved || savingId === rec.jd.id}
                          style={{
                            fontSize: 12, fontWeight: 500, padding: "7px 16px", borderRadius: 8,
                            border: isSaved ? "1px solid #e0dbd0" : "none",
                            background: isSaved ? "#fff" : "#1a1a18",
                            color: isSaved ? "#888780" : "#fff",
                            cursor: isSaved ? "default" : "pointer",
                          }}
                        >
                          {savingId === rec.jd.id ? "..." : isSaved ? "✓ 已收藏" : "收藏"}
                        </button>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#888780" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: "#FFF3E6", color: "#E67E22" }}>104</span>
                      {active && (
                        <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: "#f0ebe1", color: "#1a1a18" }}>
                          積極徵才
                        </span>
                      )}
                      <span style={{ color: "#ddd" }}>·</span>
                      <span>{salaryLabel}</span>
                      <span style={{ color: "#ddd" }}>·</span>
                      <span>爬蟲 {formatCrawledDate(rec.jd.crawledAt)}</span>
                      {rec.jd.replyDays && (
                        <>
                          <span style={{ color: "#ddd" }}>·</span>
                          <span>💬 {rec.jd.replyDays}</span>
                        </>
                      )}
                    </div>

                    {/* Skills */}
                    {skills.length > 0 && (
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                        {skills.map((s) => (
                          <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)", color: "#888780", background: "#f7f6f3" }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 我的收藏 Tab ────────────────────────────────────────────────── */}
      {activeTab === "saved" && (
        <div>
          {/* Source filter pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {SOURCE_FILTERS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSourceFilter(s.value)}
                style={sourceFilter === s.value ? pillActive : pillBase}
              >
                {s.label}
              </button>
            ))}
          </div>

          {filteredApps.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#888780" }}>
              <p style={{ fontSize: 15 }}>還沒有收藏的職缺</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>從 AI 推薦收藏，或手動新增職缺</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredApps.map((app) => {
                const pBadge = PLATFORM_BADGES[app.jd.source] ?? PLATFORM_BADGES.other;
                const firstChar = app.jd.companyName.charAt(0);

                return (
                  <div
                    key={app.id}
                    style={{
                      background: "#fff", borderRadius: 14, border: "1px solid #e8e4db",
                      padding: "16px 20px", display: "flex", alignItems: "center",
                      justifyContent: "space-between", gap: 16,
                      cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onClick={() => router.push(`/board/${app.id}`)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, background: "#e8e4db",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 15, fontWeight: 700, color: "#666", flexShrink: 0,
                      }}>
                        {firstChar}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{app.jd.companyName}</span>
                          <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: pBadge.bg, color: pBadge.color }}>
                            {pBadge.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {app.jd.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#aaa8a0", marginTop: 4 }}>
                          收藏於 {formatSavedDate(app.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/board/${app.id}`}
                        style={{
                          fontSize: 12, fontWeight: 500, padding: "7px 16px", borderRadius: 8,
                          border: "1px solid #e0dbd0", background: "#fff", color: "#1a1a18",
                          textDecoration: "none", whiteSpace: "nowrap",
                        }}
                      >
                        投遞準備
                      </Link>
                      <button
                        onClick={() => handleApply(app.id)}
                        disabled={applyingId === app.id}
                        style={{
                          fontSize: 12, fontWeight: 500, padding: "7px 16px", borderRadius: 8,
                          border: "none", background: "#1a1a18", color: "#fff",
                          cursor: "pointer", opacity: applyingId === app.id ? 0.5 : 1,
                        }}
                      >
                        {applyingId === app.id ? "投遞中…" : "投遞"}
                      </button>
                      <button
                        onClick={() => handleDelete(app.id)}
                        style={{ fontSize: 12, color: "#ccc", background: "none", border: "none", cursor: "pointer", padding: "4px 6px" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <AddJobModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            router.refresh();
          }}
        />
      )}

      {showIntentModal && (
        <IntentEditModal
          initialInput={intentRaw}
          initialKeywords={keywords}
          initialLocations={locationFilter}
          onClose={() => setShowIntentModal(false)}
        />
      )}
    </div>
  );
}

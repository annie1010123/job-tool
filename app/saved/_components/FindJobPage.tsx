"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import JobDetailModal from "./JobDetailModal";
import AddJobModal from "./AddJobModal";
import IntentEditModal from "./IntentEditModal";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Jd {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  salaryRange: string | null;
  skills: string[];
  description: string | null;
  recruitmentActivity: string | null;
  replyDays: string | null;
  postedAt: string | null;
  seniority: string | null;
  externalUrl: string;
  crawledAt: string;
  source: string;
}

interface Rec {
  id: string;
  finalScore: number;
  reasoning: string | null;
  alignedSkills: unknown;
  jd: Jd;
}

interface Props {
  recommendations: Rec[];
  intentRaw: string;
  keywords: string[];
  batchDateStr: string | null;
}

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

// postedAt 格式 "YYYY/MM/DD"；無法解析的排最後（回傳 0）
function postedTime(postedAt: string | null): number {
  if (!postedAt || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(postedAt)) return 0;
  const t = new Date(postedAt.replace(/\//g, "-")).getTime();
  return isNaN(t) ? 0 : t;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FindJobPage({ recommendations, intentRaw, keywords, batchDateStr }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [sort, setSort] = useState("score");
  const [selectedRec, setSelectedRec] = useState<Rec | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  const filteredRecs = useMemo(() => {
    let list = recommendations.filter((r) => !skippedIds.has(r.jd.id));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.jd.title.toLowerCase().includes(q) || r.jd.companyName.toLowerCase().includes(q)
      );
    }
    if (scoreFilter === "high") list = list.filter((r) => r.finalScore >= 0.8);
    if (scoreFilter === "mid") list = list.filter((r) => r.finalScore >= 0.6 && r.finalScore < 0.8);
    if (sort === "score") list.sort((a, b) => b.finalScore - a.finalScore);
    if (sort === "salary") list.sort((a, b) => parseSalaryMin(b.jd.salaryRange) - parseSalaryMin(a.jd.salaryRange));
    if (sort === "crawled") list.sort((a, b) => new Date(b.jd.crawledAt).getTime() - new Date(a.jd.crawledAt).getTime());
    if (sort === "posted") list.sort((a, b) => postedTime(b.jd.postedAt) - postedTime(a.jd.postedAt));
    return list;
  }, [recommendations, search, scoreFilter, sort, skippedIds]);

  function handleApplied(jdId: string) {
    setSkippedIds((prev) => new Set([...prev, jdId]));
    setSelectedRec(null);
    router.refresh();
  }

  function handleSkipped(jdId: string) {
    // 持久化跳過：建立 status="dismissed" 的 application，重整後不再出現（也不會進求職追蹤看板）
    setSkippedIds((prev) => new Set([...prev, jdId]));
    setSelectedRec(null);
    fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jdId, status: "dismissed" }),
    }).catch(() => { /* handled by API */ });
  }

  return (
    <div>
      {/* Intent bar */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1px solid #e8e4db",
        padding: "14px 20px", marginBottom: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#888780" }}>求職意圖：</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a18" }}>{intentRaw}</span>
          {keywords.slice(0, 5).map((kw) => (
            <span key={kw} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "#f0ebe1", color: "#666" }}>
              {kw}
            </span>
          ))}
        </div>
        <button onClick={() => setShowIntentModal(true)} style={{ fontSize: 12, color: "#888780", background: "none", border: "none", cursor: "pointer" }}>
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
        padding: "14px 18px", marginBottom: 8,
        display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
      }}>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋職位、公司..."
          style={{ flex: 1, minWidth: 180, padding: "8px 14px", borderRadius: 8, border: "1px solid #e0dbd0", fontSize: 13, outline: "none", background: "#fafaf8" }}
        />
        <select value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e0dbd0", fontSize: 13, background: "#fff", cursor: "pointer" }}>
          <option value="all">全部相符度</option>
          <option value="high">≥ 80%</option>
          <option value="mid">60-79%</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e0dbd0", fontSize: 13, background: "#fff", cursor: "pointer" }}>
          <option value="score">依相符分數</option>
          <option value="salary">依薪資</option>
          <option value="posted">依上架時間</option>
          <option value="crawled">依爬蟲日期</option>
        </select>
        <button onClick={() => setShowAddModal(true)}
          style={{ fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 20, border: "none", background: "#1a1a18", color: "#fff", cursor: "pointer" }}>
          ＋ 新增職缺
        </button>
      </div>
      <div style={{ fontSize: 12, color: "#888780", marginBottom: 16, paddingLeft: 4 }}>
        顯示 {filteredRecs.length} / {recommendations.length - skippedIds.size} 筆
      </div>

      {/* Job cards */}
      {filteredRecs.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#888780" }}>
            {recommendations.length === 0 ? "職缺配對中... 明天早上 9:00 會更新" : "沒有符合篩選條件的職缺"}
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
            return (
              <div
                key={rec.id}
                onClick={() => setSelectedRec(rec)}
                style={{
                  background: "#fff", borderRadius: 14, border: "1px solid #e8e4db",
                  borderLeft: `3px solid ${active ? "#1a1a18" : "#e8e4db"}`,
                  padding: "16px 20px", cursor: "pointer",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a18", marginBottom: 3 }}>{rec.jd.title}</div>
                    <div style={{ fontSize: 13, color: "#666" }}>{rec.jd.companyName}{rec.jd.location ? ` · ${rec.jd.location}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, padding: "4px 12px", borderRadius: 8, background: "#f0ebe1", color: "#1a1a18" }}>{score}%</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#888780" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: "#FFF3E6", color: "#E67E22" }}>104</span>
                  {active && <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: "#f0ebe1", color: "#1a1a18" }}>積極徵才</span>}
                  <span style={{ color: "#ddd" }}>·</span>
                  <span>{salaryLabel}</span>
                  <span style={{ color: "#ddd" }}>·</span>
                  <span>爬蟲 {formatCrawledDate(rec.jd.crawledAt)}</span>
                </div>
                {skills.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                    {skills.map((s) => (
                      <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)", color: "#888780", background: "#f7f6f3" }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedRec && (
        <JobDetailModal
          rec={selectedRec}
          onClose={() => setSelectedRec(null)}
          onApplied={(jdId) => handleApplied(jdId)}
          onSkipped={(jdId) => handleSkipped(jdId)}
        />
      )}

      {showAddModal && <AddJobModal onClose={() => setShowAddModal(false)} onAdded={() => { setShowAddModal(false); router.refresh(); }} />}
      {showIntentModal && <IntentEditModal initialInput={intentRaw} initialKeywords={keywords} initialLocations={["台北市", "新北市"]} onClose={() => setShowIntentModal(false)} />}
    </div>
  );
}

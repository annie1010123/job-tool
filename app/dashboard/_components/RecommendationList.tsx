"use client";

import { useState, useMemo } from "react";

interface Jd {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  salaryRange: string | null;
  recruitmentActivity: string | null;
  replyDays: string | null;
  contactTime: string | null;
  postedAt: string | null;
  externalUrl: string;
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
  statMap: Record<string, number>;
  batchDateStr: string | null;
  isToday: boolean;
  keywords: string[];
  intentRaw: string;
}

const STATUS_CONFIG = [
  { value: "not_applied", label: "未投遞", color: "#888888" },
  { value: "applied",     label: "投遞中", color: "#378ADD" },
  { value: "interviewing",label: "面試中", color: "#EF9F27" },
  { value: "second_round",label: "二面",   color: "#E24B4A" },
  { value: "result",      label: "結果",   color: "#639922" },
];

const FILTERS = ["全部", "高相符 ≥80%", "積極徵才"];

function parseSalaryMin(s: string | null): number {
  if (!s) return 0;
  const text = s.replace(/,/g, "");
  const yearly = text.match(/年薪\s*(\d+)/);
  if (yearly) return Math.round(parseInt(yearly[1]) / 12);
  const monthly = text.match(/月薪\s*(\d+)/);
  if (monthly) return parseInt(monthly[1]);
  return 0;
}

export default function RecommendationList({
  recommendations,
  statMap,
  batchDateStr,
  isToday,
  keywords,
  intentRaw,
}: Props) {
  const [filter, setFilter] = useState("全部");
  const [sort, setSort] = useState("score");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [showIntent, setShowIntent] = useState(false);

  const filtered = useMemo(() => {
    let list = [...recommendations];
    if (filter === "高相符 ≥80%") list = list.filter((r) => r.finalScore >= 0.8);
    if (filter === "積極徵才") list = list.filter((r) => r.jd.recruitmentActivity?.includes("活躍"));
    if (sort === "score") list.sort((a, b) => b.finalScore - a.finalScore);
    if (sort === "date") list.sort((a, b) => (b.jd.postedAt ?? "").localeCompare(a.jd.postedAt ?? ""));
    if (sort === "salary") list.sort((a, b) => parseSalaryMin(b.jd.salaryRange) - parseSalaryMin(a.jd.salaryRange));
    return list;
  }, [recommendations, filter, sort]);

  async function handleSave(jd: Jd) {
    if (savedIds.has(jd.id)) {
      setSavedIds((prev) => { const n = new Set(prev); n.delete(jd.id); return n; });
      return;
    }
    setSavedIds((prev) => new Set([...prev, jd.id]));
    await fetch("/api/saved-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jdId: jd.id,
        externalUrl: jd.externalUrl,
        companyName: jd.companyName,
        title: jd.title,
        platform: "104",
      }),
    });
  }

  async function handleAdd(jdId: string) {
    if (addedIds.has(jdId) || addingId) return;
    setAddingId(jdId);
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jdId }),
    });
    setAddedIds((prev) => new Set([...prev, jdId]));
    setAddingId(null);
  }

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "rgba(0,0,0,0.08)", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        {STATUS_CONFIG.map((s) => (
          <a
            key={s.value}
            href="/board"
            style={{ background: "#fff", padding: "14px 8px", textAlign: "center", textDecoration: "none", display: "block", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f6f3")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            <div style={{ fontSize: 24, fontWeight: 500, color: s.color, lineHeight: 1 }}>{statMap[s.value] ?? 0}</div>
            <div style={{ fontSize: 11, color: "#888780", marginTop: 4 }}>{s.label}</div>
          </a>
        ))}
      </div>

      {/* Intent row (collapsible) */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setShowIntent((v) => !v)}
          style={{ fontSize: 12, color: "#888780", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
        >
          <span>求職意圖</span>
          <span style={{ fontSize: 10 }}>{showIntent ? "▲" : "▼"}</span>
          <a href="/onboarding/intent" onClick={(e) => e.stopPropagation()} style={{ marginLeft: 6, color: "#888780", textDecoration: "underline", textUnderlineOffset: 2, fontSize: 12 }}>編輯</a>
        </button>
        {showIntent && (
          <div style={{ marginTop: 8, padding: "10px 14px", background: "#f7f6f3", borderRadius: 8, fontSize: 13, color: "#5f5e5a" }}>
            <p style={{ marginBottom: 6 }}>{intentRaw}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {keywords.map((kw) => (
                <span key={kw} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#E6F1FB", color: "#0C447C" }}>{kw}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: "#1a1a18" }}>
            {isToday ? "今日推薦職缺" : "最近推薦職缺"}
          </span>
          {batchDateStr && (
            <span style={{ fontSize: 12, color: "#0F6E56", background: "#E1F5EE", padding: "3px 10px", borderRadius: 20 }}>
              {batchDateStr} 更新
            </span>
          )}
          <span style={{ fontSize: 13, color: "#888780" }}>共 {recommendations.length} 筆</span>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#888780" }}>職缺配對中⋯ 明天早上 8:00 會寄到你的信箱 📬</p>
        </div>
      ) : (
        <>
          {/* Filter row */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontSize: 13, padding: "6px 14px", borderRadius: 20,
                  border: `0.5px solid ${filter === f ? "#1a1a18" : "rgba(0,0,0,0.12)"}`,
                  background: filter === f ? "#1a1a18" : "#fff",
                  color: filter === f ? "#fff" : "#5f5e5a",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {f}
              </button>
            ))}
            <div style={{ width: 0.5, height: 18, background: "rgba(0,0,0,0.1)", flexShrink: 0 }} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{ marginLeft: "auto", fontSize: 13, color: "#5f5e5a", background: "transparent", border: "none", cursor: "pointer", outline: "none" }}
            >
              <option value="score">依相符分數</option>
              <option value="date">依更新日期</option>
              <option value="salary">依薪資</option>
            </select>
          </div>

          {/* Job cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((rec) => {
              const skills = (rec.alignedSkills as string[]) ?? [];
              const salaryMin = parseSalaryMin(rec.jd.salaryRange);
              const salaryLabel = salaryMin > 0 ? `${salaryMin.toLocaleString()}+` : "面議";
              const score = Math.round(rec.finalScore * 100);
              const active = rec.jd.recruitmentActivity?.includes("活躍") ?? false;
              const isSaved = savedIds.has(rec.jd.id);
              const isAdded = addedIds.has(rec.jd.id);
              const hasMeta = active || !!rec.jd.replyDays || !!rec.jd.postedAt;

              return (
                <div
                  key={rec.id}
                  style={{
                    background: "#fff",
                    border: "0.5px solid rgba(0,0,0,0.1)",
                    borderLeft: `2.5px solid ${active ? "#1D9E75" : "rgba(0,0,0,0.1)"}`,
                    borderRadius: 12,
                    padding: "16px 20px",
                    transition: "border-color 0.15s",
                  }}
                >
                  {/* Top: title + score */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a
                        href={rec.jd.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 15, fontWeight: 500, color: "#1a1a18", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none", marginBottom: 4, paddingRight: 8 }}
                      >
                        {rec.jd.title}
                      </a>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#5f5e5a", flexWrap: "wrap" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: active ? "#1D9E75" : "#c8c7c2", flexShrink: 0, display: "inline-block" }} />
                        <span>{rec.jd.companyName}</span>
                        {rec.jd.location && <><span>·</span><span>{rec.jd.location}</span></>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 56, height: 4, background: "rgba(0,0,0,0.1)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${score}%`, background: score >= 80 ? "#1D9E75" : "#BA7517", borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, minWidth: 30, textAlign: "right", color: "#1a1a18" }}>{score}%</span>
                      </div>
                      <span style={{ fontSize: 12, color: "#888780" }}>{salaryLabel}</span>
                    </div>
                  </div>

                  {/* Tags + actions */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {skills.length > 0
                        ? skills.map((s) => (
                            <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.1)", color: "#888780", background: "#f7f6f3" }}>{s}</span>
                          ))
                        : rec.reasoning && (
                            <span style={{ fontSize: 12, color: "#888780", fontStyle: "italic" }}>{rec.reasoning}</span>
                          )
                      }
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => handleSave(rec.jd)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: isSaved ? "#D85A30" : "#c8c7c2", padding: 4, borderRadius: 6, lineHeight: 1 }}
                        aria-label="收藏"
                      >
                        {isSaved ? "♥" : "♡"}
                      </button>
                      <button
                        onClick={() => handleAdd(rec.jd.id)}
                        disabled={isAdded || addingId === rec.jd.id}
                        style={{
                          fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 20,
                          border: isAdded ? "0.5px solid transparent" : "0.5px solid rgba(0,0,0,0.2)",
                          background: isAdded ? "#E1F5EE" : "#fff",
                          color: isAdded ? "#0F6E56" : "#1a1a18",
                          cursor: isAdded ? "default" : "pointer",
                          display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                          transition: "all 0.15s",
                        }}
                      >
                        {addingId === rec.jd.id ? "加入中…" : isAdded ? "✓ 已加入追蹤" : "+ 加入追蹤"}
                      </button>
                    </div>
                  </div>

                  {/* Meta row */}
                  {hasMeta && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, paddingTop: 10, borderTop: "0.5px solid rgba(0,0,0,0.06)", fontSize: 12, color: "#888780", flexWrap: "wrap" }}>
                      {active && <span style={{ color: "#0F6E56", display: "flex", alignItems: "center", gap: 3 }}>✦ 積極徵才</span>}
                      {rec.jd.replyDays && <span>💬 {rec.jd.replyDays}</span>}
                      {rec.jd.contactTime && <span>📞 {rec.jd.contactTime}</span>}
                      {rec.jd.postedAt && <span>🕐 更新 {rec.jd.postedAt}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

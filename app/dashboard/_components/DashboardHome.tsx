"use client";

import { useState } from "react";
import Link from "next/link";

interface Jd {
  id: string;
  title: string;
  companyName: string;
  externalUrl: string;
}

interface Rec {
  id: string;
  finalScore: number;
  jd: Jd;
}

interface TodoItem {
  id: string;
  type: "not_applied" | "needs_prep" | "new_recs";
  label: string;
  actionLabel: string;
  actionHref: string;
}

interface TimelineItem {
  id: string;
  type: "save" | "apply" | "interview" | "status";
  text: string;
  time: string;
}

interface Props {
  userName: string | null;
  statMap: Record<string, number>;
  intentRaw: string;
  todos: TodoItem[];
  timeline: TimelineItem[];
  topRecs: Rec[];
  totalRecs: number;
  batchDateStr: string | null;
  isToday: boolean;
}

const STATUS_CONFIG = [
  { value: "watching", label: "未投遞", color: "#888888" },
  { value: "applied", label: "投遞中", color: "#2563eb" },
  { value: "interviewing", label: "面試中", color: "#ea580c" },
  { value: "second_round", label: "二面", color: "#dc2626" },
  { value: "result", label: "結果", color: "#16a34a" },
];

const TODO_COLORS: Record<string, string> = {
  not_applied: "#ef4444",
  needs_prep: "#f59e0b",
  new_recs: "#3b82f6",
};

const TIMELINE_ICONS: Record<string, { bg: string; emoji: string }> = {
  save: { bg: "#dbeafe", emoji: "🔖" },
  apply: { bg: "#dcfce7", emoji: "📤" },
  interview: { bg: "#fef3c7", emoji: "🎤" },
  status: { bg: "#f3e8ff", emoji: "📋" },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "早安";
  if (hour < 18) return "午安";
  return "晚安";
}

export default function DashboardHome({
  userName: _userName,
  statMap,
  intentRaw,
  todos,
  timeline,
  topRecs,
  totalRecs,
  batchDateStr,
  isToday,
}: Props) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const greeting = getGreeting();
  const totalActive =
    (statMap["watching"] ?? 0) +
    (statMap["applied"] ?? 0) +
    (statMap["interviewing"] ?? 0) +
    (statMap["second_round"] ?? 0);

  function handleSave(jdId: string) {
    if (savedIds.has(jdId)) return;
    // Optimistic UI: 立刻顯示已收藏，API 背景跑
    setSavedIds((prev) => new Set([...prev, jdId]));
    fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jdId, status: "watching" }),
    }).catch(() => {
      // 失敗則回滾
      setSavedIds((prev) => { const n = new Set(prev); n.delete(jdId); return n; });
    });
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a18", marginBottom: 4 }}>
          {greeting} 👋
        </h1>
        <p style={{ fontSize: 13, color: "#888780" }}>
          {totalActive > 0
            ? `你有 ${todos.length} 個待處理事項，${statMap["applied"] ?? 0} 個職缺投遞中`
            : "開始你的求職之旅吧"}
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 1,
          background: "rgba(0,0,0,0.06)",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 20,
          border: "1px solid #e8e4db",
        }}
      >
        {STATUS_CONFIG.map((s) => (
          <Link
            key={s.value}
            href="/board"
            style={{
              background: "#fff",
              padding: "16px 8px",
              textAlign: "center",
              textDecoration: "none",
              display: "block",
              transition: "background 0.15s",
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>
              {statMap[s.value] ?? 0}
            </div>
            <div style={{ fontSize: 11, color: "#888780", marginTop: 6 }}>{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Intent bar */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: "14px 20px",
          border: "1px solid #e8e4db",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 13,
        }}
      >
        <div>
          <span style={{ color: "#888780", fontSize: 12 }}>求職意圖：</span>
          <span style={{ fontWeight: 500, color: "#1a1a18" }}>{intentRaw}</span>
        </div>
        <Link
          href="/saved"
          style={{ fontSize: 12, color: "#888780", textDecoration: "none" }}
        >
          編輯 →
        </Link>
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <Link
          href="/saved"
          style={{
            background: "#fff",
            border: "1px solid #e8e4db",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            color: "#1a1a18",
            textDecoration: "none",
            transition: "box-shadow 0.15s",
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#e8e4db",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            ＋
          </span>
          新增職缺
        </Link>
        <Link
          href="/saved"
          style={{
            background: "#fff",
            border: "1px solid #e8e4db",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            color: "#1a1a18",
            textDecoration: "none",
            transition: "box-shadow 0.15s",
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#e8e4db",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            🔗
          </span>
          貼 URL 收藏職缺
        </Link>
      </div>

      {/* Two columns: Todo + Timeline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* 待處理 */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: "18px 20px",
            border: "1px solid #e8e4db",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a18" }}>待處理</span>
            <Link
              href="/board"
              style={{ fontSize: 12, color: "#888780", textDecoration: "none" }}
            >
              查看全部 →
            </Link>
          </div>
          {todos.length === 0 ? (
            <p style={{ fontSize: 13, color: "#888780", textAlign: "center", padding: "20px 0" }}>
              沒有待處理事項 🎉
            </p>
          ) : (
            todos.map((todo, i) => (
              <div
                key={todo.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: i < todos.length - 1 ? "1px solid #f0ebe1" : "none",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: TODO_COLORS[todo.type] ?? "#888",
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, color: "#444", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {todo.label}
                </span>
                <Link
                  href={todo.actionHref}
                  style={{
                    fontSize: 12,
                    color: "#2563eb",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {todo.actionLabel}
                </Link>
              </div>
            ))
          )}
        </div>

        {/* 最近動態 */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: "18px 20px",
            border: "1px solid #e8e4db",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a18" }}>最近動態</span>
          </div>
          {timeline.length === 0 ? (
            <p style={{ fontSize: 13, color: "#888780", textAlign: "center", padding: "20px 0" }}>
              還沒有動態
            </p>
          ) : (
            timeline.map((item, i) => {
              const icon = TIMELINE_ICONS[item.type] ?? TIMELINE_ICONS.status;
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: i < timeline.length - 1 ? "1px solid #f0ebe1" : "none",
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: icon.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    {icon.emoji}
                  </span>
                  <div>
                    <div style={{ color: "#555", lineHeight: 1.5 }}>{item.text}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{item.time}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 今日推薦 (top 3) */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: "18px 20px",
          border: "1px solid #e8e4db",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a18" }}>
              {isToday ? "今日推薦" : "最近推薦"}
            </span>
            {batchDateStr && (
              <span
                style={{
                  fontSize: 11,
                  color: "#0F6E56",
                  background: "#E1F5EE",
                  padding: "3px 10px",
                  borderRadius: 20,
                }}
              >
                {batchDateStr} 更新
              </span>
            )}
          </div>
          {totalRecs > 0 && (
            <Link
              href="/saved"
              style={{ fontSize: 12, color: "#888780", textDecoration: "none" }}
            >
              查看全部 {totalRecs} 筆 →
            </Link>
          )}
        </div>

        {topRecs.length === 0 ? (
          <div style={{ padding: "30px 0", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#888780" }}>
              職缺配對中⋯ 明天早上 8:00 會寄到你的信箱 📬
            </p>
          </div>
        ) : (
          topRecs.map((rec, i) => {
            const score = Math.round(rec.finalScore * 100);
            const isSaved = savedIds.has(rec.jd.id);
            return (
              <div
                key={rec.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: i < topRecs.length - 1 ? "1px solid #f0ebe1" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a
                    href={rec.jd.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#1a1a18",
                      textDecoration: "none",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {rec.jd.companyName}
                  </a>
                  <div style={{ fontSize: 12, color: "#888780", marginTop: 2 }}>{rec.jd.title}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#16a34a",
                      background: "#dcfce7",
                      padding: "2px 10px",
                      borderRadius: 10,
                    }}
                  >
                    {score}%
                  </span>
                  <button
                    onClick={() => handleSave(rec.jd.id)}
                    disabled={isSaved}
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      padding: "5px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: isSaved ? "#E1F5EE" : "#1a1a18",
                      color: isSaved ? "#0F6E56" : "#fff",
                      cursor: isSaved ? "default" : "pointer",
                    }}
                  >
                    {isSaved ? "✓ 已收藏" : "收藏"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

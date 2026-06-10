"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AddJobModal from "./AddJobModal";

interface WatchingApp {
  id: string;
  companyType: string | null;
  createdAt: string;
  jd: {
    id: string;
    title: string;
    companyName: string;
    source: string;
    externalUrl: string;
  };
}

const PLATFORM_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  "104": { bg: "#E6F1FB", color: "#0C447C", label: "104" },
  linkedin: { bg: "#E8F4F8", color: "#0A66C2", label: "LinkedIn" },
  cake: { bg: "#FFF3E6", color: "#E67E22", label: "Cake" },
  yourator: { bg: "#E8F8E8", color: "#2E7D32", label: "Yourator" },
  manual: { bg: "#f7f6f3", color: "#888780", label: "手動新增" },
  other: { bg: "#f7f6f3", color: "#888780", label: "其他" },
};

const COMPANY_TYPE_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  startup: { bg: "#FFF3E6", color: "#E67E22", label: "新創" },
  large: { bg: "#E6F1FB", color: "#0C447C", label: "大公司" },
  traditional: { bg: "#f7f6f3", color: "#888780", label: "傳產" },
};

const TYPE_OPTIONS = ["全部", "startup", "large", "traditional"] as const;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function SavedJobList({ initialApps }: { initialApps: WatchingApp[] }) {
  const router = useRouter();
  const [apps, setApps] = useState<WatchingApp[]>(initialApps);
  const [typeFilter, setTypeFilter] = useState<string>("全部");

  useEffect(() => {
    setApps(initialApps);
  }, [initialApps]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const filtered = apps.filter((a) =>
    typeFilter === "全部" || a.companyType === typeFilter
  );

  async function handleApply(appId: string) {
    setApplyingId(appId);
    try {
      const resp = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "applied", appliedAt: new Date().toISOString() }),
      });
      if (resp.ok) {
        setApps((prev) => prev.filter((a) => a.id !== appId));
        router.refresh();
      }
    } finally {
      setApplyingId(null);
    }
  }

  async function handleDelete(appId: string) {
    const resp = await fetch(`/api/applications/${appId}`, { method: "DELETE" });
    if (resp.ok) {
      setApps((prev) => prev.filter((a) => a.id !== appId));
      router.refresh();
    }
  }

  const pillBase: React.CSSProperties = {
    fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 20,
    border: "0.5px solid rgba(0,0,0,0.15)", cursor: "pointer",
    background: "#fff", color: "#1a1a18", transition: "background 0.15s",
  };
  const pillActive: React.CSSProperties = {
    ...pillBase, background: "#1a1a18", color: "#fff", border: "0.5px solid #1a1a18",
  };

  return (
    <>
      {/* Filter + Add button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TYPE_OPTIONS.map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} style={typeFilter === t ? pillActive : pillBase}>
              {t === "全部" ? "全部類型" : (COMPANY_TYPE_BADGES[t]?.label ?? t)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{ fontSize: 13, fontWeight: 500, padding: "7px 16px", borderRadius: 20, border: "none", background: "#1a1a18", color: "#fff", cursor: "pointer" }}
        >
          ＋新增職缺
        </button>
      </div>

      {/* Job cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#888780" }}>
          <p style={{ fontSize: 15 }}>還沒有收藏的職缺</p>
          <a href="/dashboard" style={{ fontSize: 13, color: "#888780", marginTop: 8, display: "inline-block" }}>→ 去推薦頁找職缺</a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((app) => {
            const pBadge = PLATFORM_BADGES[app.jd.source] ?? PLATFORM_BADGES.other;
            const tBadge = app.companyType ? COMPANY_TYPE_BADGES[app.companyType] : null;
            return (
              <div
                key={app.id}
                style={{
                  background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.1)",
                  padding: "14px 18px", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a18" }}>{app.jd.companyName}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: pBadge.bg, color: pBadge.color }}>
                      {pBadge.label}
                    </span>
                    {tBadge && (
                      <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: tBadge.bg, color: tBadge.color }}>
                        {tBadge.label}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#444440", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {app.jd.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa8a0", marginTop: 4 }}>收藏於 {formatDate(app.createdAt)}</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <a
                    href={`/board/${app.id}`}
                    style={{ fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.15)", background: "#fff", color: "#1a1a18", textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    準備推薦信
                  </a>
                  <button
                    onClick={() => handleApply(app.id)}
                    disabled={applyingId === app.id}
                    style={{ fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 20, border: "none", background: "#1a1a18", color: "#fff", cursor: "pointer", opacity: applyingId === app.id ? 0.5 : 1 }}
                  >
                    {applyingId === app.id ? "投遞中…" : "投遞"}
                  </button>
                  <button
                    onClick={() => handleDelete(app.id)}
                    style={{ fontSize: 12, color: "#aaa8a0", background: "none", border: "none", cursor: "pointer", padding: "4px 6px" }}
                  >
                    刪除
                  </button>
                </div>
              </div>
            );
          })}
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
    </>
  );
}

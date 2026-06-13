"use client";

import { useState, useEffect } from "react";

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
  rec: Rec;
  isSaved: boolean;
  onClose: () => void;
  onSaved: (jdId: string) => void;
  onSkipped: (jdId: string) => void;
}

/* ── helpers ── */
function parseJdSections(desc: string | null) {
  if (!desc) return { workContent: [], requirements: [], extras: [] };
  const lines = desc.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const workContent: string[] = [];
  const requirements: string[] = [];
  const extras: string[] = [];
  let section: "work" | "req" | "extra" | null = null;

  for (const line of lines) {
    if (/工作內容|工作描述|職務內容/.test(line)) { section = "work"; continue; }
    if (/要求條件|條件要求|應徵條件|需求條件/.test(line)) { section = "req"; continue; }
    if (/工作待遇|休假|福利|上班/.test(line)) { section = "extra"; extras.push(line); continue; }
    if (section === "work") workContent.push(line.replace(/^\d+[.、]\s*/, ""));
    else if (section === "req") requirements.push(line.replace(/^[•·\-*]\s*/, ""));
    else if (section === "extra") extras.push(line);
    else extras.push(line);
  }
  return { workContent, requirements, extras };
}

function parseSalaryLabel(s: string | null): string {
  if (!s) return "面議";
  return s;
}

export default function JobDetailModal({ rec, isSaved, onClose, onSaved, onSkipped }: Props) {
  const { jd } = rec;
  const score = Math.round(rec.finalScore * 100);
  const skills = (jd.skills as string[]) ?? [];
  const active = jd.recruitmentActivity?.includes("活躍") ?? false;
  const { workContent, requirements, extras } = parseJdSections(jd.description);

  // Cover letter state
  const [emphasis, setEmphasis] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [clLoading, setClLoading] = useState(false);
  const [clError, setClError] = useState("");
  const [lang, setLang] = useState<"zh" | "en">("zh");
  const [copied, setCopied] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isSaved);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function generateCoverLetter() {
    setClLoading(true);
    setClError("");
    try {
      const resp = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdId: jd.id, tone: "formal", emphasis, lang }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `錯誤 ${resp.status}`);
      }
      const data = await resp.json() as { coverLetter: string };
      setCoverLetter(data.coverLetter);
    } catch (e) {
      setClError(e instanceof Error ? e.message : "生成失敗");
    } finally {
      setClLoading(false);
    }
  }

  async function handleSave() {
    if (saved || saving) return;
    setSaving(true);
    try {
      const resp = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdId: jd.id, status: "not_applied", coverLetter: coverLetter || undefined }),
      });
      if (resp.ok) {
        setSaved(true);
        onSaved(jd.id);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    /* Overlay */
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
    >
      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#faf9f6", borderRadius: 16, width: "calc(100vw - 60px)",
          height: "calc(100vh - 60px)", overflow: "hidden", position: "relative",
          boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 18, right: 20, width: 32, height: 32,
            border: "none", background: "rgba(0,0,0,0.05)", borderRadius: 8,
            fontSize: 18, color: "#888", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 2,
          }}
        >
          &times;
        </button>

        {/* Two-column body */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", flex: 1, minHeight: 0 }}>
          {/* ═══ Left: Job Info ═══ */}
          <div style={{ borderRight: "0.5px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Fixed header */}
            <div style={{ padding: "32px 36px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a18", marginBottom: 6, lineHeight: 1.35, flex: 1 }}>
                  {jd.title}
                </h1>
                <a
                  href={jd.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flexShrink: 0, fontSize: 12, fontWeight: 600, padding: "7px 16px",
                    borderRadius: 8, background: "#1a1a18", color: "#fff",
                    textDecoration: "none", whiteSpace: "nowrap",
                  }}
                >
                  查看 104 原文 ↗
                </a>
              </div>
              <p style={{ fontSize: 14, color: "#5f5e5a", marginBottom: 14 }}>
                {jd.companyName}{jd.location ? `・${jd.location}` : ""}
              </p>

              {/* Meta row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, fontWeight: 500, background: "#E1F5EE", color: "#0F6E56" }}>
                  104
                </span>
                {active && (
                  <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, fontWeight: 500, background: "#FFF3E0", color: "#C77A00", border: "0.5px solid rgba(199,122,0,0.2)" }}>
                    積極徵才
                  </span>
                )}
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#ccc" }} />
                <span style={{ fontSize: 13, color: "#888780" }}>{parseSalaryLabel(jd.salaryRange)}</span>
                {jd.postedAt && (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#ccc" }} />
                    <span style={{ fontSize: 13, color: "#888780" }}>刊登 {jd.postedAt}</span>
                  </>
                )}
                {jd.replyDays && (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#ccc" }} />
                    <span style={{ fontSize: 13, color: "#888780" }}>{jd.replyDays}</span>
                  </>
                )}
              </div>

              {/* Match row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#C77A00" }}>{score}% 相符</span>
              </div>

              {/* 職缺描述 heading */}
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1a1a18", marginBottom: 0, paddingBottom: 8, borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
                職缺描述
              </h3>
            </div>

            {/* Scrollable description */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 36px 28px" }}>
              {workContent.length > 0 && (
                <>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a18", margin: "16px 0 10px" }}>【工作內容】</div>
                  <ol style={{ paddingLeft: 4, marginBottom: 6 }}>
                    {workContent.map((item, i) => (
                      <li key={i} style={{ fontSize: 13.5, color: "#3d3d3a", lineHeight: 1.75, listStyle: "none", paddingLeft: 16, position: "relative" }}>
                        <span style={{ position: "absolute", left: 0, top: 10, width: 5, height: 5, borderRadius: "50%", background: "#c8c7c2" }} />
                        {item}
                      </li>
                    ))}
                  </ol>
                </>
              )}

              {requirements.length > 0 && (
                <>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a18", margin: "16px 0 10px" }}>【要求條件】</div>
                  <ul style={{ paddingLeft: 4, marginBottom: 6 }}>
                    {requirements.map((item, i) => (
                      <li key={i} style={{ fontSize: 13.5, color: "#3d3d3a", lineHeight: 1.75, listStyle: "none", paddingLeft: 16, position: "relative" }}>
                        <span style={{ position: "absolute", left: 2, top: 0, color: "#c8c7c2" }}>•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {extras.map((line, i) => (
                <div key={i} style={{ fontSize: 13.5, color: "#3d3d3a", lineHeight: 1.7, marginBottom: 4 }}>
                  {line}
                </div>
              ))}

              {/* fallback: raw description */}
              {workContent.length === 0 && requirements.length === 0 && jd.description && (
                <p style={{ fontSize: 13.5, color: "#3d3d3a", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                  {jd.description}
                </p>
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a18", margin: "20px 0 10px" }}>技能需求</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {skills.map((s) => (
                      <span key={s} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8, background: "#f0efe9", color: "#5f5e5a", border: "0.5px solid rgba(0,0,0,0.08)" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ═══ Right: Cover Letter ═══ */}
          <div style={{ padding: "24px 36px 28px", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>✨</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a18" }}>推薦信</span>
            </div>

            <div style={{ fontSize: 13, color: "#888780", marginBottom: 6 }}>想特別強調的內容（選填）</div>
            <textarea
              value={emphasis}
              onChange={(e) => setEmphasis(e.target.value)}
              placeholder="例：特別強調我的敏捷開發經驗、提到我有即可到職..."
              style={{
                width: "100%", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10,
                padding: "12px 14px", fontSize: 13, background: "#fff", resize: "none",
                outline: "none", fontFamily: "inherit", color: "#1a1a18", minHeight: 60,
                boxSizing: "border-box",
              }}
            />

            {/* Language toggle */}
            <div style={{ display: "inline-flex", borderRadius: 8, overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.1)", margin: "10px 0" }}>
              {(["zh", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    padding: "8px 20px", fontSize: 13, border: "none", cursor: "pointer",
                    fontWeight: 500, transition: "all 0.15s",
                    background: lang === l ? "#1a1a18" : "#fff",
                    color: lang === l ? "#fff" : "#888780",
                  }}
                >
                  {l === "zh" ? "中文版" : "English"}
                </button>
              ))}
            </div>

            {clError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: "#DC2626", margin: 0 }}>{clError}</p>
              </div>
            )}

            <div style={{ fontSize: 13, color: "#888780", marginBottom: 8 }}>生成結果（可直接編輯）</div>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="點擊下方「生成推薦信」按鈕開始..."
              style={{
                width: "100%", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 10,
                padding: 16, fontSize: 13.5, background: "#fff", resize: "vertical",
                outline: "none", fontFamily: "inherit", color: "#1a1a18", minHeight: 350,
                lineHeight: 1.75, boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={generateCoverLetter}
                disabled={clLoading}
                style={{
                  padding: "12px 28px", borderRadius: 10, border: "none",
                  background: clLoading ? "#888" : "#1a1a18", color: "#fff", fontSize: 14,
                  fontWeight: 600, cursor: clLoading ? "not-allowed" : "pointer",
                }}
              >
                {clLoading ? "生成中..." : "生成推薦信"}
              </button>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(coverLetter);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                disabled={!coverLetter}
                style={{
                  padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                  background: "#fff", color: coverLetter ? "#1a1a18" : "#bbb",
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  cursor: coverLetter ? "pointer" : "not-allowed",
                }}
              >
                {copied ? "已複製 ✓" : "複製"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12,
          padding: "12px 36px", borderTop: "0.5px solid rgba(0,0,0,0.06)",
          background: "#faf9f6", flexShrink: 0,
        }}>
          <button
            onClick={handleSave}
            disabled={saved || saving}
            style={{
              padding: "10px 28px", borderRadius: 10, border: "none",
              background: "#1a1a18", color: "#fff",
              fontSize: 14, fontWeight: 600,
              cursor: saved ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "申請中..." : "已申請"}
          </button>
          <button
            onClick={() => onSkipped(jd.id)}
            style={{
              padding: "10px 28px", borderRadius: 10, border: "1.5px solid #D85A30",
              background: "transparent", color: "#D85A30", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            刪除此職缺
          </button>
        </div>
      </div>
    </div>
  );
}

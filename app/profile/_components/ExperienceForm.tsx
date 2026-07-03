"use client";

import { useState } from "react";
import type { WorkExp } from "./ExperienceList";

interface Props {
  initial?: WorkExp;
  onSave: (exp: WorkExp) => void;
  onCancel: () => void;
}

const EXP_TYPES = ["工作", "實習", "專案", "社團", "競賽", "課程"];

export default function ExperienceForm({ initial, onSave, onCancel }: Props) {
  const [type, setType] = useState(initial?.type ?? "實習");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [bullets, setBullets] = useState<string[]>(initial?.bullets ?? [""]);
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>((initial?.skills as string[]) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setSkillInput("");
  }

  function updateBullet(index: number, value: string) {
    setBullets((prev) => prev.map((b, i) => (i === index ? value : b)));
  }

  function addBullet() {
    setBullets((prev) => [...prev, ""]);
  }

  function removeBullet(index: number) {
    setBullets((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) {
      setError("名稱和角色為必填");
      return;
    }
    setSaving(true);
    setError("");
    const cleanBullets = bullets.map((b) => b.trim()).filter(Boolean);
    const description = cleanBullets.join("\n");
    try {
      const url = initial ? `/api/profile/experiences/${initial.id}` : "/api/profile/experiences";
      const method = initial ? "PATCH" : "POST";
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, company, role, startDate, endDate, description, bullets: cleanBullets, skills }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "儲存失敗");
      }
      const data = await resp.json() as { experience: WorkExp };
      onSave(data.experience);
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial) return;
    const resp = await fetch(`/api/profile/experiences/${initial.id}`, { method: "DELETE" });
    if (resp.ok) {
      onCancel();
      window.location.reload();
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", fontSize: 13, padding: "9px 12px", borderRadius: 8,
    border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", color: "#1a1a18",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#888780", marginBottom: 4, display: "block" };

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.15)", padding: "20px 22px", marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a18" }}>
          {initial ? "編輯經歷" : "新增經歷"}
        </p>
        {initial && (
          <div style={{ display: "flex", gap: 6 }}>
            {confirmDelete ? (
              <>
                <button onClick={handleDelete}
                  style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: "none", background: "#e53e3e", color: "#fff", cursor: "pointer" }}>
                  確認刪除
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.15)", background: "#fff", color: "#888780", cursor: "pointer" }}>
                  取消
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: "none", background: "none", color: "#aaa8a0", cursor: "pointer" }}>
                刪除
              </button>
            )}
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit}>
        {/* Type */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>類型</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EXP_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                style={{
                  fontSize: 12, padding: "5px 14px", borderRadius: 20, cursor: "pointer",
                  border: type === t ? "none" : "0.5px solid #e2ddd0",
                  background: type === t ? "#1a1a18" : "#fff",
                  color: type === t ? "#fff" : "#555552",
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Company + Role */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>公司 / 組織 / 專案名稱 *</label>
            <input style={inputStyle} value={company} onChange={(e) => setCompany(e.target.value)}
              placeholder={type === "專案" ? "例：校園二手交易平台" : "例：Tripmate"} />
          </div>
          <div>
            <label style={labelStyle}>職稱 / 角色 *</label>
            <input style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}
              placeholder={type === "專案" ? "例：產品負責人" : "例：產品經理"} />
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>開始時間</label>
            <input style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="例：2024/03" />
          </div>
          <div>
            <label style={labelStyle}>結束時間</label>
            <input style={inputStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="例：2024/08 或 至今" />
          </div>
        </div>

        {/* Bullets */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>
            經歷重點 <span style={{ color: "#aaa8a0", fontWeight: 400 }}>（每一點代表一個可被 AI 配對到面試題的素材）</span>
          </label>
          {bullets.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#aaa8a0", marginTop: 10, flexShrink: 0 }}>•</span>
              <textarea
                style={{ ...inputStyle, minHeight: 44, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, flex: 1 }}
                value={b}
                onChange={(e) => updateBullet(i, e.target.value)}
                placeholder={i === 0 ? "例：主導用戶研究，訪談 8 位用戶，產出 persona 與 journey map" : "新增一項經歷重點..."}
              />
              {bullets.length > 1 && (
                <button type="button" onClick={() => removeBullet(i)}
                  style={{ fontSize: 14, color: "#aaa8a0", background: "none", border: "none", cursor: "pointer", marginTop: 8, flexShrink: 0 }}>
                  ×
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addBullet}
            style={{ fontSize: 12, color: "#888780", background: "none", border: "1px dashed #d8d1c0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginTop: 2 }}>
            + 新增一點
          </button>
        </div>

        {/* Skills */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>技能標籤（選填）</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
              placeholder="輸入技能後按 Enter，例：GA4、用戶訪談"
            />
            <button type="button" onClick={addSkill}
              style={{ fontSize: 12, padding: "9px 14px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
              加入
            </button>
          </div>
          {skills.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {skills.map((sk) => (
                <span key={sk} onClick={() => setSkills((prev) => prev.filter((s) => s !== sk))}
                  style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#f1efe8", color: "#555552", border: "0.5px solid rgba(0,0,0,0.08)", cursor: "pointer" }}>
                  {sk} ×
                </span>
              ))}
            </div>
          )}
        </div>

        {error && <p style={{ fontSize: 13, color: "#e53e3e", marginBottom: 12 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onCancel}
            style={{ fontSize: 13, padding: "8px 18px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", color: "#888780", cursor: "pointer" }}>
            取消
          </button>
          <button type="submit" disabled={saving}
            style={{ fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 20, border: "none", background: "#1a1a18", color: "#fff", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
            {saving ? "儲存中…" : "儲存"}
          </button>
        </div>
      </form>
    </div>
  );
}

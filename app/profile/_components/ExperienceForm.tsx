"use client";

import { useState } from "react";
import type { WorkExp } from "./ExperienceList";

interface Props {
  initial?: WorkExp;
  onSave: (exp: WorkExp) => void;
  onCancel: () => void;
}

export default function ExperienceForm({ initial, onSave, onCancel }: Props) {
  const [company, setCompany] = useState(initial?.company ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>((initial?.skills as string[]) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setSkillInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim() || !description.trim()) {
      setError("公司名稱、職稱和工作描述為必填");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = initial ? `/api/profile/experiences/${initial.id}` : "/api/profile/experiences";
      const method = initial ? "PATCH" : "POST";
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role, startDate, endDate, description, skills }),
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

  const inputStyle: React.CSSProperties = {
    width: "100%", fontSize: 13, padding: "9px 12px", borderRadius: 8,
    border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", color: "#1a1a18",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#888780", marginBottom: 4, display: "block" };

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.15)", padding: "20px 22px", marginBottom: 4 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a18", marginBottom: 16 }}>
        {initial ? "編輯經歷" : "新增工作經歷"}
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>公司名稱 *</label>
            <input style={inputStyle} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="例：Tripmate" />
          </div>
          <div>
            <label style={labelStyle}>職稱 *</label>
            <input style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)} placeholder="例：產品經理實習生" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>開始時間</label>
            <input style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="例：2024/03" />
          </div>
          <div>
            <label style={labelStyle}>結束時間</label>
            <input style={inputStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="例：2024/08 或 現在" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>工作描述 * <span style={{ color: "#aaa8a0", fontWeight: 400 }}>（用 STAR 法則描述，AI 會挑選最相關段落放入推薦信）</span></label>
          <textarea
            style={{ ...inputStyle, minHeight: 120, resize: "vertical", fontFamily: "inherit", lineHeight: 1.65 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={"例：\n【情境】接手電商平台 GA4 週報後，發現 Destination 頁面跳出率逾 60%\n【任務】找出根本原因並提出改善方案\n【行動】進行 5 位用戶訪談，確認導覽架構問題，主導三項改動\n【結果】跳出率降至 2.8%，頁面黏性達首頁 15 倍"}
          />
        </div>
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
            <button type="button" onClick={addSkill} style={{ fontSize: 12, padding: "9px 14px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
              加入
            </button>
          </div>
          {skills.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {skills.map((sk) => (
                <span key={sk} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#f1efe8", color: "#555552", border: "0.5px solid rgba(0,0,0,0.08)", cursor: "pointer" }}
                  onClick={() => setSkills((prev) => prev.filter((s) => s !== sk))}>
                  {sk} ×
                </span>
              ))}
            </div>
          )}
        </div>

        {error && <p style={{ fontSize: 13, color: "#e53e3e", marginBottom: 12 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onCancel} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", color: "#888780", cursor: "pointer" }}>
            取消
          </button>
          <button type="submit" disabled={saving} style={{ fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 20, border: "none", background: "#1a1a18", color: "#fff", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
            {saving ? "儲存中…" : "儲存"}
          </button>
        </div>
      </form>
    </div>
  );
}

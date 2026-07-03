"use client";

import { useState } from "react";

export interface ProfileInfo {
  name: string | null;
  email: string;
  school: string | null;
  department: string | null;
  grade: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
}

const GRADES = ["大一", "大二", "大三", "大四", "研究所", "已畢業"];

export default function ProfileInfoCard({ initial }: { initial: ProfileInfo }) {
  const [profile, setProfile] = useState<ProfileInfo>(initial);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const hasDetails = profile.school || profile.department || profile.grade;

  async function handleSave() {
    setSaving(true);
    try {
      const resp = await fetch("/api/profile/info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!resp.ok) throw new Error("儲存失敗");
      const data = await resp.json() as { profile: ProfileInfo };
      setProfile(data.profile);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", fontSize: 13, padding: "9px 12px", borderRadius: 8,
    border: "0.5px solid rgba(0,0,0,0.15)", background: "#fff", color: "#1a1a18",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#888780", marginBottom: 4, display: "block" };

  if (editing) {
    return (
      <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 14, padding: "20px 22px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a18", marginBottom: 16 }}>編輯個人資料</div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>姓名</label>
          <input style={inputStyle} value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>學校</label>
            <input style={inputStyle} value={form.school ?? ""} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="例：政大" />
          </div>
          <div>
            <label style={labelStyle}>科系</label>
            <input style={inputStyle} value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="例：資管" />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>年級</label>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {GRADES.map((g) => (
              <button
                key={g} type="button"
                onClick={() => setForm({ ...form, grade: g })}
                style={{
                  fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 20, cursor: "pointer",
                  background: form.grade === g ? "#1a1a18" : "#fff",
                  color: form.grade === g ? "#fff" : "#555552",
                  border: form.grade === g ? "none" : "0.5px solid #e2ddd0",
                }}
              >{g}</button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "0.5px solid #efece5", margin: "16px 0" }} />

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>作品集連結 <span style={{ fontSize: 10, color: "#aaa8a0" }}>（選填）</span></label>
          <input style={inputStyle} value={form.portfolioUrl ?? ""} onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })} placeholder="https://..." />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>LinkedIn <span style={{ fontSize: 10, color: "#aaa8a0" }}>（選填）</span></label>
          <input style={inputStyle} value={form.linkedinUrl ?? ""} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/..." />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Email</label>
          <div style={{ ...inputStyle, background: "#f5f3ee", color: "#aaa8a0", border: "0.5px solid rgba(0,0,0,0.08)" }}>
            {profile.email}
            <span style={{ fontSize: 10, color: "#c8c3b8", marginLeft: 6 }}>登入帳號，無法修改</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => { setEditing(false); setForm(profile); }}
            style={{ fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.15)", background: "#fff", color: "#888780", cursor: "pointer" }}>
            取消
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 20, border: "none", background: "#1a1a18", color: "#fff", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
            {saving ? "儲存中…" : "儲存"}
          </button>
        </div>
      </div>
    );
  }

  // Display mode
  return (
    <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a18" }}>{profile.name || "未設定姓名"}</div>
          {hasDetails && (
            <div style={{ fontSize: 13, color: "#555552", marginTop: 3 }}>
              {[profile.school, profile.department].filter(Boolean).join("")}
              {profile.grade && ` · ${profile.grade}`}
            </div>
          )}
          <div style={{ fontSize: 12, color: "#aaa8a0", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 7l10 7 10-7"/></svg>
            {profile.email}
          </div>
        </div>
        <button onClick={() => { setForm(profile); setEditing(true); }}
          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.15)", background: "#fff", color: "#888780", cursor: "pointer" }}>
          編輯
        </button>
      </div>

      {/* Links or empty state prompts */}
      {(profile.portfolioUrl || profile.linkedinUrl) ? (
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {profile.portfolioUrl && (
            <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: "#555552", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, border: "0.5px solid #e2ddd0", background: "#fff" }}>
              <svg width="11" height="11" fill="none" stroke="#888780" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              作品集
            </a>
          )}
          {profile.linkedinUrl && (
            <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: "#555552", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, border: "0.5px solid #e2ddd0", background: "#fff" }}>
              <svg width="11" height="11" fill="none" stroke="#888780" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              LinkedIn
            </a>
          )}
        </div>
      ) : !hasDetails ? (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#faf9f5", border: "0.5px solid #efece5", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "#888780", marginBottom: 8 }}>補充資料讓 AI 幫你生成更精準的推薦信和自我介紹</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => { setForm(profile); setEditing(true); }}
              style={{ fontSize: 11, color: "#888780", padding: "4px 10px", borderRadius: 20, border: "1px dashed #d8d1c0", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              + 學校 / 科系
            </button>
            <button onClick={() => { setForm(profile); setEditing(true); }}
              style={{ fontSize: 11, color: "#888780", padding: "4px 10px", borderRadius: 20, border: "1px dashed #d8d1c0", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              + 作品集連結
            </button>
            <button onClick={() => { setForm(profile); setEditing(true); }}
              style={{ fontSize: 11, color: "#888780", padding: "4px 10px", borderRadius: 20, border: "1px dashed #d8d1c0", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              + LinkedIn
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

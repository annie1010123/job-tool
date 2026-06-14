"use client";

import { useState, useRef } from "react";
import ExperienceCard from "./ExperienceCard";
import ExperienceForm from "./ExperienceForm";

export interface WorkExp {
  id: string;
  type?: string;
  company: string;
  role: string;
  startDate: string | null;
  endDate: string | null;
  description: string;
  skills: string[];
  order: number;
}

export default function ExperienceList({ initialExperiences }: { initialExperiences: WorkExp[] }) {
  const [exps, setExps] = useState<WorkExp[]>(initialExperiences);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAdded(exp: WorkExp) {
    setExps((prev) => [...prev, exp]);
    setShowForm(false);
  }

  async function runImport(opts: { text?: string; file?: File }) {
    setImporting(true);
    setImportError("");
    try {
      let resp: Response;
      if (opts.file) {
        const fd = new FormData();
        fd.append("file", opts.file);
        resp = await fetch("/api/profile/experiences/parse", { method: "POST", body: fd });
      } else {
        resp = await fetch("/api/profile/experiences/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: opts.text }),
        });
      }
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error((data as { error?: string }).error ?? "解析失敗");
      const created = (data as { experiences: WorkExp[] }).experiences ?? [];
      setExps((prev) => [...prev, ...created]);
      setImportText("");
      setShowImport(false);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "解析失敗");
    } finally {
      setImporting(false);
    }
  }

  function handleUpdated(updated: WorkExp) {
    setExps((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const resp = await fetch(`/api/profile/experiences/${id}`, { method: "DELETE" });
    if (resp.ok) setExps((prev) => prev.filter((e) => e.id !== id));
  }

  const s = {
    sectionTitle: { fontSize: 13, fontWeight: 600, color: "#888780", letterSpacing: "0.05em", textTransform: "uppercase" as const, marginBottom: 12 },
    addBtn: { fontSize: 13, fontWeight: 500, padding: "7px 16px", borderRadius: 20, border: "none", background: "#1a1a18", color: "#fff", cursor: "pointer" },
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={s.sectionTitle}>我的經歷 ({exps.length})</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { setShowImport((v) => !v); setImportError(""); }}
            style={{ fontSize: 13, fontWeight: 500, padding: "7px 16px", borderRadius: 20, border: "1px solid #1a1a18", background: "#fff", color: "#1a1a18", cursor: "pointer" }}
          >
            ✨ 快速匯入
          </button>
          <button onClick={() => setShowForm(true)} style={s.addBtn}>＋ 手動新增</button>
        </div>
      </div>

      {showImport && (
        <div style={{ background: "#faf9f6", border: "1px solid #e8e4db", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a18", marginBottom: 4 }}>貼上履歷或經歷文字，AI 幫你拆成多筆經歷</p>
          <p style={{ fontSize: 12, color: "#888780", marginBottom: 10 }}>工作、實習、專案、社團、競賽都可以；解析後可再編輯</p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"直接貼上你的履歷內容，或一段段經歷描述…\n例：2024/03-2024/08 在 Tripmate 擔任產品實習生，負責…"}
            disabled={importing}
            style={{ width: "100%", minHeight: 120, fontSize: 13, padding: "10px 12px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }}
          />
          {importError && <p style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>{importError}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <button
              onClick={() => runImport({ text: importText })}
              disabled={importing || !importText.trim()}
              style={{ fontSize: 13, fontWeight: 600, padding: "9px 20px", borderRadius: 8, border: "none", background: importing || !importText.trim() ? "#bbb" : "#1a1a18", color: "#fff", cursor: importing || !importText.trim() ? "not-allowed" : "pointer" }}
            >
              {importing ? "AI 解析中…" : "AI 解析並加入"}
            </button>
            <span style={{ fontSize: 12, color: "#aaa8a0" }}>或</span>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              style={{ fontSize: 13, fontWeight: 500, padding: "9px 16px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", color: "#1a1a18", cursor: "pointer" }}
            >
              上傳履歷 PDF
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) runImport({ file: f }); e.target.value = ""; }}
            />
          </div>
        </div>
      )}

      {showForm && (
        <ExperienceForm
          onSave={handleAdded}
          onCancel={() => setShowForm(false)}
        />
      )}

      {exps.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#888780" }}>
          <p style={{ fontSize: 15, marginBottom: 8 }}>還沒有任何經歷</p>
          <p style={{ fontSize: 13 }}>點「✨ 快速匯入」貼上履歷或經歷文字，AI 幫你拆成多筆——比手動填快多了</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {exps.map((exp) =>
            editingId === exp.id ? (
              <ExperienceForm
                key={exp.id}
                initial={exp}
                onSave={handleUpdated}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ExperienceCard
                key={exp.id}
                exp={exp}
                onEdit={() => setEditingId(exp.id)}
                onDelete={() => handleDelete(exp.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

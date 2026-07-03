"use client";

import { useState, useRef } from "react";
import ExperienceForm from "./ExperienceForm";

export interface WorkExp {
  id: string;
  type?: string;
  company: string;
  role: string;
  startDate: string | null;
  endDate: string | null;
  description: string;
  bullets: string[];
  skills: string[];
  order: number;
}

const FILTER_TABS = ["全部", "實習", "專案", "社團", "競賽", "工作", "課程"];

function TimelineItem({
  exp,
  onUpdate,
  onDelete,
  onEdit,
}: {
  exp: WorkExp;
  onUpdate: (updated: WorkExp) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newBullet, setNewBullet] = useState("");
  const [editingBulletIdx, setEditingBulletIdx] = useState<number | null>(null);
  const [editingBulletText, setEditingBulletText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const ongoing = !exp.endDate || exp.endDate === "現在" || exp.endDate === "至今";
  const dateRange = [exp.startDate, exp.endDate || "至今"].filter(Boolean).join(" – ");
  const bullets = exp.bullets ?? [];

  async function saveBullets(newBullets: string[]) {
    setSaving(true);
    try {
      const resp = await fetch(`/api/profile/experiences/${exp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bullets: newBullets, description: newBullets.join("\n") }),
      });
      if (resp.ok) {
        const data = await resp.json() as { experience: WorkExp };
        onUpdate(data.experience);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleAddBullet() {
    if (!newBullet.trim()) return;
    const updated = [...bullets, newBullet.trim()];
    saveBullets(updated);
    setNewBullet("");
  }

  function handleDeleteBullet(idx: number) {
    saveBullets(bullets.filter((_, i) => i !== idx));
  }

  function handleStartEditBullet(idx: number) {
    setEditingBulletIdx(idx);
    setEditingBulletText(bullets[idx]);
  }

  function handleSaveEditBullet() {
    if (editingBulletIdx === null || !editingBulletText.trim()) return;
    const updated = bullets.map((b, i) => (i === editingBulletIdx ? editingBulletText.trim() : b));
    saveBullets(updated);
    setEditingBulletIdx(null);
    setEditingBulletText("");
  }

  async function handleDeleteExp() {
    const resp = await fetch(`/api/profile/experiences/${exp.id}`, { method: "DELETE" });
    if (resp.ok) onDelete(exp.id);
  }

  return (
    <div style={{ position: "relative", paddingBottom: 24 }}>
      {/* Dot */}
      <div style={{
        position: "absolute", left: -24, top: 6, width: 11, height: 11, borderRadius: "50%", zIndex: 1,
        background: ongoing ? "#1a1a18" : "#f5f3ee",
        border: ongoing ? "2px solid #1a1a18" : "2px solid #c8c3b8",
      }} />

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
          <div style={{ fontSize: 13, color: "#aaa8a0", marginBottom: 3 }}>{dateRange}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            {exp.type && exp.type !== "工作" && (
              <span style={{ fontSize: 12, fontWeight: 500, color: "#0f6e56", background: "#E1F5EE", borderRadius: 6, padding: "2px 8px" }}>{exp.type}</span>
            )}
            <span style={{ fontSize: 16, fontWeight: 600, color: "#1a1a18", lineHeight: 1.4 }}>
              {exp.company} — {exp.role}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0, marginTop: 2 }}>
          <button onClick={onEdit}
            style={{ fontSize: 12, padding: "4px 10px", borderRadius: 16, border: "0.5px solid #e2ddd0", background: "#fff", color: "#888780", cursor: "pointer" }}>
            編輯
          </button>
          {confirmDelete ? (
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={handleDeleteExp}
                style={{ fontSize: 12, padding: "4px 10px", borderRadius: 16, border: "none", background: "#e53e3e", color: "#fff", cursor: "pointer" }}>
                確認
              </button>
              <button onClick={() => setConfirmDelete(false)}
                style={{ fontSize: 12, padding: "4px 10px", borderRadius: 16, border: "0.5px solid #e2ddd0", background: "#fff", color: "#888780", cursor: "pointer" }}>
                取消
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              style={{ fontSize: 12, padding: "4px 10px", borderRadius: 16, border: "0.5px solid #e2ddd0", background: "#fff", color: "#aaa8a0", cursor: "pointer" }}>
              刪除
            </button>
          )}
        </div>
      </div>

      {/* Collapsed preview */}
      {!expanded && (
        <div style={{ cursor: "pointer" }} onClick={() => setExpanded(true)}>
          {bullets.length > 0 ? (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, listStyleType: "disc" }}>
              {bullets.slice(0, 2).map((b, i) => (
                <li key={i} style={{ fontSize: 14, color: "#555552", lineHeight: 1.6 }}>{b}</li>
              ))}
              {bullets.length > 2 && (
                <li style={{ fontSize: 14, color: "#aaa8a0", lineHeight: 1.6 }}>⋯ 還有 {bullets.length - 2} 點（點擊展開）</li>
              )}
            </ul>
          ) : exp.description ? (
            <div style={{ fontSize: 14, color: "#555552", marginTop: 4, lineHeight: 1.6, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
              {exp.description}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#aaa8a0", marginTop: 4, cursor: "pointer" }}>
              + 點擊新增經歷重點
            </div>
          )}

          {(exp.skills as string[]).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {(exp.skills as string[]).map((sk) => (
                <span key={sk} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, border: "0.5px solid #e2ddd0", color: "#555552", background: "#fff" }}>{sk}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expanded: all bullets + add/edit/delete */}
      {expanded && (
        <div style={{ marginTop: 8, background: "#faf9f5", border: "0.5px solid #efece5", borderRadius: 10, padding: "12px 14px" }}>
          {/* Existing bullets */}
          {bullets.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18, listStyleType: "disc" }}>
              {bullets.map((b, i) => (
                <li key={i} style={{ marginBottom: 6, fontSize: 14, color: "#555552", lineHeight: 1.6 }}>
                  {editingBulletIdx === i ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        value={editingBulletText}
                        onChange={(e) => setEditingBulletText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveEditBullet(); if (e.key === "Escape") setEditingBulletIdx(null); }}
                        autoFocus
                        style={{ flex: 1, fontSize: 14, padding: "6px 10px", borderRadius: 6, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", outline: "none" }}
                      />
                      <button onClick={handleSaveEditBullet} disabled={saving}
                        style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "none", background: "#1a1a18", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
                        存
                      </button>
                      <button onClick={() => setEditingBulletIdx(null)}
                        style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "0.5px solid #e2ddd0", background: "#fff", color: "#888780", cursor: "pointer" }}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <span>{b}</span>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => handleStartEditBullet(i)}
                          style={{ fontSize: 11, color: "#888780", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
                          改
                        </button>
                        <button onClick={() => handleDeleteBullet(i)}
                          style={{ fontSize: 11, color: "#aaa8a0", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: 13, color: "#aaa8a0", marginBottom: 8 }}>還沒有經歷重點，新增一個吧</div>
          )}

          {/* Add new bullet */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input
              value={newBullet}
              onChange={(e) => setNewBullet(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddBullet(); }}
              placeholder="輸入一項經歷重點，按 Enter 新增"
              style={{ flex: 1, fontSize: 13, padding: "7px 10px", borderRadius: 6, border: "0.5px solid rgba(0,0,0,0.15)", background: "#fff", outline: "none" }}
            />
            <button onClick={handleAddBullet} disabled={saving || !newBullet.trim()}
              style={{ fontSize: 12, padding: "7px 14px", borderRadius: 6, border: "none", background: !newBullet.trim() ? "#ccc" : "#1a1a18", color: "#fff", cursor: !newBullet.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
              + 新增
            </button>
          </div>

          {/* Skills */}
          {(exp.skills as string[]).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10, paddingTop: 10, borderTop: "0.5px solid #efece5" }}>
              {(exp.skills as string[]).map((sk) => (
                <span key={sk} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, border: "0.5px solid #e2ddd0", color: "#555552", background: "#fff" }}>{sk}</span>
              ))}
            </div>
          )}

          {/* Collapse */}
          <button onClick={() => setExpanded(false)}
            style={{ fontSize: 12, color: "#aaa8a0", background: "none", border: "none", cursor: "pointer", marginTop: 8, padding: 0 }}>
            ▲ 收合
          </button>
        </div>
      )}
    </div>
  );
}

export default function ExperienceList({ initialExperiences }: { initialExperiences: WorkExp[] }) {
  const [exps, setExps] = useState<WorkExp[]>(initialExperiences);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("全部");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAdded(exp: WorkExp) {
    setExps((prev) => [...prev, exp]);
    setShowForm(false);
  }

  function handleUpdated(updated: WorkExp) {
    setExps((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditingId(null);
  }

  function handleDelete(id: string) {
    setExps((prev) => prev.filter((e) => e.id !== id));
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

  const filtered = exps.filter((e) => {
    if (filter !== "全部" && e.type !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const text = `${e.company} ${e.role} ${e.description} ${(e.bullets ?? []).join(" ")} ${(e.skills as string[]).join(" ")}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Action bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a18" }}>
          經歷庫 <span style={{ fontSize: 13, fontWeight: 400, color: "#aaa8a0" }}>({exps.length})</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => { setShowImport((v) => !v); setImportError(""); }}
            style={{ fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 20, border: "1px solid #1a1a18", background: "#fff", color: "#1a1a18", cursor: "pointer" }}>
            ✨ 快速匯入
          </button>
          <button onClick={() => setShowForm(true)}
            style={{ fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 20, background: "#1a1a18", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            新增
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, border: "0.5px solid #e2ddd0", borderRadius: 10, padding: "8px 12px", background: "#fff", marginBottom: 10 }}>
        <svg width="14" height="14" fill="none" stroke="#aaa8a0" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋經歷..."
          style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#1a1a18", background: "transparent" }}
        />
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 5, marginBottom: 18, flexWrap: "wrap" }}>
        {FILTER_TABS.map((tab) => (
          <button key={tab} onClick={() => setFilter(tab)}
            style={{
              fontSize: 12, fontWeight: filter === tab ? 600 : 500, padding: "4px 12px", borderRadius: 20, cursor: "pointer",
              background: filter === tab ? "#1a1a18" : "#fff",
              color: filter === tab ? "#fff" : "#555552",
              border: filter === tab ? "none" : "0.5px solid #e2ddd0",
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Import panel */}
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
              style={{ fontSize: 13, fontWeight: 600, padding: "9px 20px", borderRadius: 8, border: "none", background: importing || !importText.trim() ? "#bbb" : "#1a1a18", color: "#fff", cursor: importing || !importText.trim() ? "not-allowed" : "pointer" }}>
              {importing ? "AI 解析中…" : "AI 解析並加入"}
            </button>
            <span style={{ fontSize: 12, color: "#aaa8a0" }}>或</span>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              style={{ fontSize: 13, fontWeight: 500, padding: "9px 16px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", color: "#1a1a18", cursor: "pointer" }}>
              上傳履歷 PDF
            </button>
            <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) runImport({ file: f }); e.target.value = ""; }} />
          </div>
        </div>
      )}

      {/* New experience form */}
      {showForm && (
        <div style={{ marginBottom: 16 }}>
          <ExperienceForm onSave={handleAdded} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Timeline */}
      {filtered.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#888780" }}>
          <p style={{ fontSize: 15, marginBottom: 8 }}>
            {exps.length === 0 ? "還沒有任何經歷" : "沒有符合的經歷"}
          </p>
          {exps.length === 0 && (
            <p style={{ fontSize: 13 }}>點「✨ 快速匯入」貼上履歷，AI 幫你拆成多筆</p>
          )}
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 5, top: 8, bottom: 0, width: 1.5, background: "#e2ddd0" }} />

          {filtered.map((exp) =>
            editingId === exp.id ? (
              <div key={exp.id} style={{ position: "relative", paddingBottom: 22 }}>
                <div style={{ position: "absolute", left: -24, top: 6, width: 11, height: 11, borderRadius: "50%", border: "2px solid #c8c3b8", background: "#f5f3ee", zIndex: 1 }} />
                <ExperienceForm initial={exp} onSave={handleUpdated} onCancel={() => setEditingId(null)} />
              </div>
            ) : (
              <TimelineItem
                key={exp.id}
                exp={exp}
                onUpdate={(updated) => setExps((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))}
                onDelete={handleDelete}
                onEdit={() => setEditingId(exp.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

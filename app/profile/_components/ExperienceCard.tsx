"use client";

import { useState } from "react";
import type { WorkExp } from "./ExperienceList";

export default function ExperienceCard({
  exp,
  onEdit,
  onDelete,
}: {
  exp: WorkExp;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dateRange = [exp.startDate, exp.endDate].filter(Boolean).join(" ～ ");

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "0.5px solid rgba(0,0,0,0.1)",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
            {exp.type && exp.type !== "工作" && (
              <span style={{ fontSize: 11, fontWeight: 500, color: "#0f6e56", background: "#E1F5EE", borderRadius: 6, padding: "2px 8px", alignSelf: "center" }}>{exp.type}</span>
            )}
            <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a18" }}>{exp.company}</span>
            <span style={{ fontSize: 13, color: "#555552" }}>{exp.role}</span>
          </div>
          {dateRange && (
            <p style={{ fontSize: 12, color: "#aaa8a0", marginBottom: 10 }}>{dateRange}</p>
          )}
          <p style={{ fontSize: 13, color: "#444440", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{exp.description}</p>
          {(exp.skills as string[]).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {(exp.skills as string[]).map((sk) => (
                <span key={sk} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f1efe8", color: "#555552", border: "0.5px solid rgba(0,0,0,0.08)" }}>
                  {sk}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={onEdit}
            style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.15)", background: "#fff", color: "#1a1a18", cursor: "pointer" }}
          >
            編輯
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={onDelete}
                style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: "none", background: "#e53e3e", color: "#fff", cursor: "pointer" }}
              >
                確認刪除
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.15)", background: "#fff", color: "#888780", cursor: "pointer" }}
              >
                取消
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: "none", background: "none", color: "#aaa8a0", cursor: "pointer" }}
            >
              刪除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

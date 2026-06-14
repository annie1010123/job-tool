"use client";

import { useState } from "react";
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

  function handleAdded(exp: WorkExp) {
    setExps((prev) => [...prev, exp]);
    setShowForm(false);
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
        <p style={s.sectionTitle}>工作經歷 ({exps.length})</p>
        <button onClick={() => setShowForm(true)} style={s.addBtn}>＋ 新增經歷</button>
      </div>

      {showForm && (
        <ExperienceForm
          onSave={handleAdded}
          onCancel={() => setShowForm(false)}
        />
      )}

      {exps.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#888780" }}>
          <p style={{ fontSize: 15, marginBottom: 8 }}>還沒有工作經歷</p>
          <p style={{ fontSize: 13 }}>加入後，AI 會在生成推薦信時自動挑選最符合職缺的 2-3 段</p>
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

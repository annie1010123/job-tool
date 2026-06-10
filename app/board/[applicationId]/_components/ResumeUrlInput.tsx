"use client";

import { useState } from "react";

export default function ResumeUrlInput({
  applicationId,
  initialValue,
}: {
  applicationId: string;
  initialValue: string | null;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (value === (initialValue ?? "")) return;
    setSaving(true);
    await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeUrl: value.trim() || null }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <p className="text-xs text-zinc-400 mb-1">履歷連結</p>
      <div className="flex gap-2 items-center">
        <input
          type="url"
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); }}
          onBlur={save}
          placeholder="Canva 連結、PDF URL…"
          className="flex-1 text-sm text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 outline-none focus:border-zinc-400 transition-colors"
        />
        {saving && <span className="text-xs text-zinc-400 shrink-0">儲存中…</span>}
        {saved && <span className="text-xs text-green-600 shrink-0">已儲存</span>}
      </div>
    </div>
  );
}

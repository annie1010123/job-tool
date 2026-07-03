"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ArchivedApp {
  id: string; archiveReason: string | null; archivedAt: string | null;
  jd: { title: string; companyName: string };
}

const REASON: Record<string, { label: string; cls: string }> = {
  ghosted:  { label: "久沒回音",   cls: "bg-zinc-100 text-zinc-500" },
  rejected: { label: "收到感謝信", cls: "bg-red-50 text-red-600" },
  withdrew: { label: "主動放棄",   cls: "bg-[#f0ebe1] text-[#5F5E5A]" },
};

interface Props { apps: ArchivedApp[]; onRestore: (id: string) => void; }

export default function ArchiveSection({ apps, onRestore }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  if (apps.length === 0) return null;

  return (
    <div className="mt-8">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-600 transition-colors px-1 py-2 w-full text-left">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .2s" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
        封存區（{apps.length} 筆）
        <span className="text-xs text-zinc-300 ml-1">已結束或久沒回音</span>
      </button>

      {open && (
        <div className="border border-zinc-100 rounded-xl overflow-hidden bg-white mt-1">
          <div className="grid grid-cols-[1fr_1fr_120px_90px_70px] text-xs text-zinc-400 font-medium uppercase tracking-wide px-4 py-2 bg-zinc-50 border-b border-zinc-100">
            <span>公司</span><span>職缺</span><span>封存原因</span><span>日期</span><span />
          </div>
          {apps.map(app => {
            const r = REASON[app.archiveReason ?? "ghosted"] ?? REASON.ghosted;
            const date = app.archivedAt
              ? new Date(app.archivedAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })
              : "—";
            return (
              <div key={app.id}
                onClick={() => router.push(`/board/${app.id}`)}
                className="grid grid-cols-[1fr_1fr_120px_90px_70px] items-center px-4 py-3 border-b border-zinc-50 last:border-0 opacity-60 hover:opacity-100 hover:bg-zinc-50 transition-all cursor-pointer">
                <span className="text-sm font-medium text-zinc-700">{app.jd.companyName}</span>
                <span className="text-sm text-zinc-500">{app.jd.title}</span>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full w-fit ${r.cls}`}>{r.label}</span>
                <span className="text-xs text-zinc-400">{date}</span>
                <div onClick={e => e.stopPropagation()}>
                  <button onClick={() => onRestore(app.id)}
                    className="text-xs text-zinc-400 border border-zinc-200 rounded-md px-2 py-1 hover:text-zinc-700 hover:border-zinc-400 transition-colors">
                    復原
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

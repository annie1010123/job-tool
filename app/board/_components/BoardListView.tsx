"use client";
import { useRouter } from "next/navigation";

interface Jd { id: string; title: string; companyName: string; }
export interface ListApp {
  id: string; status: string; companyType: string | null;
  createdAt: string; scheduledAt: string | null; appliedAt: string | null;
  jd: Jd; interviewRecords: unknown[];
}

const STATUS_LABEL: Record<string, string> = {
  applied: "投遞中", interviewing: "面試中（一面）", second_round: "面試中（二面）",
  offer: "錄取 🎉", rejected: "感謝信",
};
const STATUS_BADGE: Record<string, string> = {
  applied:     "bg-[#f0ebe1] text-[#5F5E5A]",
  interviewing:"bg-amber-50 text-amber-700",
  second_round:"bg-amber-100 text-amber-800",
  offer:       "bg-green-50 text-green-700",
  rejected:    "bg-red-50 text-red-600",
};
const GROUP_ORDER = ["interviewing", "second_round", "applied", "offer", "rejected"];
const GHOST_DAYS = 14;

function daysSince(d: string | null) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}
function daysUntil(d: string | null): string | null {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  if (diff === 2) return "後天";
  if (diff < 0) return `${Math.abs(diff)} 天前`;
  return `${diff} 天後`;
}

interface Props {
  apps: ListApp[];
  onArchive: (appId: string, reason: string) => void;
}

export default function BoardListView({ apps, onArchive }: Props) {
  const router = useRouter();
  const grouped = GROUP_ORDER
    .map(s => ({ status: s, items: apps.filter(a => a.status === s) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      {grouped.map(({ status, items }) => (
        <div key={status}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              {STATUS_LABEL[status]}
            </span>
            <span className="text-xs text-zinc-300 bg-zinc-100 rounded-full px-2">{items.length}</span>
          </div>
          <div className="grid grid-cols-[1fr_1fr_130px_80px_140px] text-xs text-zinc-400 font-medium uppercase tracking-wide px-4 pb-1.5">
            <span>公司</span><span>職缺</span><span>狀態</span><span>天數</span><span />
          </div>
          <div className="space-y-1.5">
            {items.map(app => {
              const ghosted = status === "applied" && (daysSince(app.appliedAt ?? app.createdAt) ?? 0) >= GHOST_DAYS;
              const appliedDays = daysSince(app.appliedAt ?? app.createdAt);
              const interviewLabel = status === "interviewing" ? daysUntil(app.scheduledAt) : null;

              return (
                <div
                  key={app.id}
                  onClick={() => router.push(`/board/${app.id}`)}
                  className={`grid grid-cols-[1fr_1fr_130px_80px_140px] items-center bg-white border rounded-xl px-4 py-3 cursor-pointer hover:shadow-sm transition-all ${
                    ghosted
                      ? "border-l-[3px] border-l-orange-400 border-y-zinc-100 border-r-zinc-100"
                      : "border-zinc-100 hover:border-zinc-200"
                  }`}
                >
                  <span className="text-sm font-semibold text-zinc-900 truncate">{app.jd.companyName}</span>
                  <span className="text-sm text-zinc-600 truncate">{app.jd.title}</span>
                  <div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${ghosted ? "bg-orange-50 text-orange-700" : STATUS_BADGE[status]}`}>
                      {ghosted ? "⚠ 久沒回音" : STATUS_LABEL[status]}
                    </span>
                  </div>
                  <span className={`text-xs ${ghosted ? "text-orange-500 font-semibold" : "text-zinc-500"}`}>
                    {status === "applied" && appliedDays != null ? `${appliedDays} 天` : ""}
                    {status === "interviewing" && interviewLabel ? interviewLabel : ""}
                  </span>
                  <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                    {status === "interviewing" && (
                      <button onClick={() => router.push(`/board/${app.id}`)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#5DCAA5] bg-[#E1F5EE] text-[#0f6e56]">
                        準備面試
                      </button>
                    )}
                    {(ghosted || status === "offer" || status === "rejected") && (
                      <button onClick={() => onArchive(app.id, ghosted ? "ghosted" : status === "rejected" ? "rejected" : "withdrew")}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700">
                        封存
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
